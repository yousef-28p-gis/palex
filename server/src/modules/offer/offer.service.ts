import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { QueryOffersDto } from './dto/query-offers.dto';

@Injectable()
export class OfferService {
  private readonly logger = new Logger(OfferService.name);

  constructor(private prisma: PrismaService) {}

  private sanitizeText(text: string): string {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/[&<>]/g, (match) => {
        if (match === '&') return '&amp;';
        if (match === '<') return '&lt;';
        if (match === '>') return '&gt;';
        return match;
      })
      .substring(0, 2000);
  }

  async getOffers(query: QueryOffersDto) {
    const { fiatCurrency, network, minPrice, maxPrice, page = 1, limit = 20 } = query;
    
    const exchangeRateRecord = await this.prisma.exchangeRate.findFirst();
    const baseRate = exchangeRateRecord ? Number(exchangeRateRecord.usdToIls) : 3.50;
    
    const trc20FeeRecord = await this.prisma.networkFee.findUnique({ where: { network: 'TRC20' } });
    const bep20FeeRecord = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
    
    const trc20Fee = trc20FeeRecord?.feeAmount || 1.5;
    const bep20Fee = bep20FeeRecord?.feeAmount || 0.5;
    
    const where: any = { status: 'active' };
    if (fiatCurrency) where.fiatCurrency = fiatCurrency;
    if (network) where.network = network;
    
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;

    const offers = await this.prisma.offer.findMany({
      where,
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            averageRating: true,
            totalTrades: true,

            kycStatus: true,
            profileImageUrl: true,
            workHoursStart: true,
            workHoursEnd: true,
            workDays: true,
            isActiveNow: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: skip,
      take: take,
    });

    const offersWithLivePrice = offers.map(offer => {
      const premiumPercent = offer.premiumPercent ? Number(offer.premiumPercent) : 0;
      let livePrice: number;
      
      if (offer.fiatCurrency === 'usd') {
        livePrice = 1 * (1 + premiumPercent / 100);
      } else {
        livePrice = baseRate * (1 + premiumPercent / 100);
      }
      
      return {
        ...offer,
        price: parseFloat(livePrice.toFixed(4)),
        baseRate: offer.fiatCurrency === 'usd' ? 1 : baseRate,
      };
    });

    let filteredOffers = offersWithLivePrice;
    if (minPrice !== undefined) {
      filteredOffers = filteredOffers.filter(o => o.price >= Number(minPrice));
    }
    if (maxPrice !== undefined) {
      filteredOffers = filteredOffers.filter(o => o.price <= Number(maxPrice));
    }

    const total = filteredOffers.length;
    
    return { 
      data: filteredOffers, 
      meta: { 
        page: Number(page), 
        limit: take, 
        total, 
        totalPages: Math.ceil(total / take) 
      },
      fees: {
        trc20: trc20Fee,
        bep20: bep20Fee,
      },
    };
  }

  async getMyOffers(userId: string) {
    const offers = await this.prisma.offer.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return offers;
  }

  async getOfferById(offerId: string) {
    const exchangeRateRecord = await this.prisma.exchangeRate.findFirst();
    const baseRate = exchangeRateRecord ? Number(exchangeRateRecord.usdToIls) : 3.50;
    
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            averageRating: true,
            totalTrades: true,

            kycStatus: true,
            workHoursStart: true,
            workHoursEnd: true,
            workDays: true,
            isActiveNow: true,
            lastSeenAt: true,
          },
        },
      },
    });
    
    if (!offer) {
      throw new NotFoundException('العرض غير موجود أو تم حذفه');
    }
    
    if (offer.status !== 'active') {
      throw new BadRequestException(`هذا العرض غير نشط حالياً (الحالة: ${offer.status === 'paused' ? 'موقوف' : 'منتهي'})`);
    }
    
    const premiumPercent = offer.premiumPercent ? Number(offer.premiumPercent) : 0;
    let livePrice: number;
    
    if (offer.fiatCurrency === 'usd') {
      livePrice = 1 * (1 + premiumPercent / 100);
    } else {
      livePrice = baseRate * (1 + premiumPercent / 100);
    }
    
    return {
      ...offer,
      price: parseFloat(livePrice.toFixed(4)),
      baseRate: offer.fiatCurrency === 'usd' ? 1 : baseRate,
    };
  }

  async createOffer(userId: string, dto: CreateOfferDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }
    
    if (user.kycStatus !== 'approved') {
      throw new ForbiddenException('يجب إكمال توثيق الهوية (KYC) أولاً قبل إنشاء عرض بيع');
    }
    
    if (user.isSuspended) {
      throw new ForbiddenException('حسابك موقوف. لا يمكنك إنشاء عروض بيع جديدة.');
    }
    
    if (dto.minAmount < 10) {
      throw new BadRequestException('الحد الأدنى يجب أن يكون 10 USDT على الأقل');
    }
    
    if (dto.maxAmount <= dto.minAmount) {
      throw new BadRequestException('الحد الأقصى يجب أن يكون أكبر من الحد الأدنى');
    }
    
    if (dto.maxAmount > 100000) {
      throw new BadRequestException('الحد الأقصى لا يمكن أن يتجاوز 100,000 USDT');
    }
    
    if (!dto.bankName) {
      throw new BadRequestException('يرجى اختيار البنك الذي ستستقبل عليه التحويلات');
    }
    
    const cleanInstructions = this.sanitizeText(dto.paymentInstructions);
    
    if (!cleanInstructions || cleanInstructions.length < 10) {
      throw new BadRequestException('تعليمات الدفع مطلوبة ويجب أن تكون 10 أحرف على الأقل');
    }

    const offer = await this.prisma.offer.create({
      data: {
        sellerId: userId,
        fiatCurrency: dto.fiatCurrency,
        premiumPercent: dto.premiumPercent,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        network: dto.network,
        paymentInstructions: cleanInstructions,
        bankName: dto.bankName,
        status: 'active',
      },
    });

    this.logger.log(`✅ New offer created by user ${userId}: ${offer.id}`);
    
    return { success: true, message: 'تم إنشاء العرض بنجاح', offer };
  }

  async updateOffer(id: string, userId: string, dto: UpdateOfferDto) {
    const offer = await this.prisma.offer.findFirst({ where: { id, sellerId: userId } });
    
    if (!offer) {
      throw new NotFoundException('العرض غير موجود');
    }
    
    if (offer.status !== 'active') {
      throw new BadRequestException('لا يمكن تعديل عرض غير نشط');
    }
    
    if (dto.minAmount && dto.minAmount < 10) {
      throw new BadRequestException('الحد الأدنى يجب أن يكون 10 USDT على الأقل');
    }
    
    const currentMinAmount = Number(offer.minAmount);
    const currentMaxAmount = Number(offer.maxAmount);
    const newMinAmount = dto.minAmount !== undefined ? dto.minAmount : currentMinAmount;
    const newMaxAmount = dto.maxAmount !== undefined ? dto.maxAmount : currentMaxAmount;
    
    if (newMaxAmount <= newMinAmount) {
      throw new BadRequestException('الحد الأقصى يجب أن يكون أكبر من الحد الأدنى');
    }
    
    let cleanInstructions: string | undefined;
    if (dto.paymentInstructions) {
      cleanInstructions = this.sanitizeText(dto.paymentInstructions);
      if (cleanInstructions.length < 10) {
        throw new BadRequestException('تعليمات الدفع يجب أن تكون 10 أحرف على الأقل');
      }
    }

    const updated = await this.prisma.offer.update({ 
      where: { id }, 
      data: {
        premiumPercent: dto.premiumPercent,
        minAmount: dto.minAmount,
        maxAmount: dto.maxAmount,
        paymentInstructions: cleanInstructions,
      }
    });
    
    return { success: true, message: 'تم تحديث العرض', offer: updated };
  }

  async deleteOffer(id: string, userId: string) {
    const offer = await this.prisma.offer.findFirst({ where: { id, sellerId: userId } });
    
    if (!offer) {
      throw new NotFoundException('العرض غير موجود');
    }
    
    const activeTrades = await this.prisma.trade.count({
      where: { 
        offerId: id, 
        status: { in: ['waiting_seller_deposit', 'active', 'waiting_seller_confirmation'] } 
      },
    });
    
    if (activeTrades > 0) {
      throw new BadRequestException('لا يمكن حذف العرض لأنه يحتوي على صفقات نشطة. يرجى انتظار اكتمالها أولاً.');
    }
    
    await this.prisma.offer.delete({ where: { id } });
    
    this.logger.log(`✅ Offer deleted: ${id} by user ${userId}`);
    
    return { success: true, message: 'تم حذف العرض بنجاح' };
  }

  // ✅ روابط الصفقات النشطة للبائع (أيقونة الواتساب)
  async getActiveTradeLinksForSeller(userId: string) {
    const activeStatuses = ['waiting_seller_deposit', 'waiting_buyer_payment', 'pending_confirmation'];
    
    const trades = await this.prisma.trade.findMany({
      where: {
        sellerId: userId,
        status: { in: activeStatuses },
      },
      select: {
        id: true,
        offerId: true,
        status: true,
        tradeReference: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return trades;
  }
}