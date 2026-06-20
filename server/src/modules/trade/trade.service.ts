import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';
import { WalletService } from '../wallet/wallet.service';
import { TradeGateway } from './trade.gateway';
import { StartTradeDto } from './dto/start-trade.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);
  private readonly timeouts = new Map<string, NodeJS.Timeout>();
  private pendingRequests = new Map<string, { buyerId: string; offerId: string; amount: number; buyerName: string }>();

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private walletService: WalletService,
    private tradeGateway: TradeGateway,
  ) {}

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'waiting_seller_deposit': 'انتظار إيداع البائع',
      'active': 'نشطة - انتظار دفع المشتري',
      'waiting_seller_confirmation': 'انتظار تأكيد البائع',
      'completed': 'مكتملة',
      'cancelled': 'ملغاة',
      'dispute_opened': 'نزاع مفتوح',
      'expired': 'منتهية',
    };
    return statusMap[status] || status;
  }

  private cancelExpiryTimeout(tradeId: string) {
    const timeout = this.timeouts.get(tradeId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(tradeId);
      this.logger.log(`✅ Cancelled expiry timeout for trade ${tradeId}`);
    }
  }

  private scheduleExpiryHandler(tradeId: string, expiresAt: Date) {
    const timeUntilExpiry = expiresAt.getTime() - Date.now();
    
    if (timeUntilExpiry <= 0) {
      this.walletService.handleExpiredTrade(tradeId);
      return;
    }
    
    const timeout = setTimeout(async () => {
      this.timeouts.delete(tradeId);
      await this.walletService.handleExpiredTrade(tradeId);
    }, timeUntilExpiry);
    
    this.timeouts.set(tradeId, timeout);
    this.logger.log(`⏰ Scheduled expiry handler for trade ${tradeId} in ${Math.round(timeUntilExpiry / 60000)} minutes`);
  }

  // ✅ إعلام المشتري بانتهاء مهلة البائع
  private async notifyBuyerOfSellerTimeout(tradeId: string, buyerId: string, sellerName: string) {
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { email: true, fullName: true }
    });
    
    if (buyer) {
      await this.mailService.sendEmail({
        to: buyer.email,
        subject: '⚠️ انتهت مهلة البائع - PalEscrow',
        html: `
          <div dir="rtl">
            <h2>مرحباً ${buyer.fullName}</h2>
            <p>لم يقم البائع ${sellerName} بإرسال USDT خلال المهلة المحددة (30 دقيقة).</p>
            <p>تم إلغاء الصفقة تلقائياً.</p>
            <p>يمكنك شراء USDT من بائع آخر.</p>
            <hr />
            <p style="font-size: 12px; color: #666;">إذا كان لديك استفسار، يرجى مراجعة الدعم الفني.</p>
          </div>
        `,
      });
      
      // إرسال إشعار WebSocket
      this.tradeGateway.sendToUser(buyerId, 'trade:timeout', {
        message: 'لم يقم البائع بإرسال USDT خلال المهلة. تم إلغاء الصفقة.',
        tradeId,
      });
    }
  }

  // ✅ طلب تأكيد وجود البائع (مرحلة ما قبل الصفقة)
  async requestSellerConfirmation(offerId: string, amount: number, buyerId: string, buyerName: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId, status: 'active' },
      include: { seller: true },
    });

    if (!offer) {
      throw new NotFoundException('العرض غير موجود');
    }

    if (offer.seller.isSuspended) {
      throw new BadRequestException('البائع موقوف حالياً، لا يمكن الشراء منه');
    }

    const pendingId = `pending_${Date.now()}_${offerId}`;
    
    this.pendingRequests.set(pendingId, {
      buyerId,
      offerId,
      amount,
      buyerName,
    });

    this.tradeGateway.sendToUser(offer.sellerId, 'trade:pending', {
      pendingId,
      offerId,
      amount,
      buyerName,
      message: `📢 لديك طلب شراء بمبلغ ${amount} USDT من ${buyerName}. اضغط "أنا موجود" لتأكيد وجودك.`,
      countdown: 600,
    });

    await this.mailService.sendEmail({
      to: offer.seller.email,
      subject: '🆕 طلب شراء جديد - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${offer.seller.fullName}</h2>
      <p>يوجد طلب شراء جديد بمبلغ ${amount} USDT من ${buyerName}.</p>
      <p>يرجى تسجيل الدخول وتأكيد وجودك خلال 10 دقائق.</p></div>`,
    });

    const timeout = setTimeout(() => {
      this.pendingRequests.delete(pendingId);
      this.tradeGateway.sendToUser(buyerId, 'trade:timeout', {
        message: 'انتهت المهلة، لم يؤكد البائع وجوده. يرجى المحاولة مرة أخرى.',
      });
    }, 10 * 60 * 1000);

    this.timeouts.set(pendingId, timeout);

    return { success: true, pendingId, message: 'جاري انتظار تأكيد البائع' };
  }

  // ✅ البائع يؤكد وجوده
  async confirmSellerPresence(pendingId: string, offerId: string, sellerId: string) {
    const pendingRequest = this.pendingRequests.get(pendingId);
    if (!pendingRequest) {
      throw new BadRequestException('الطلب غير موجود أو انتهت صلاحيته');
    }

    const timeout = this.timeouts.get(pendingId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(pendingId);
    }

    this.pendingRequests.delete(pendingId);

    this.tradeGateway.sendToUser(pendingRequest.buyerId, 'trade:ready', {
      message: 'البائع جاهز، يمكنك بدء الصفقة الآن',
      sellerId,
      offerId,
    });

    return { success: true, message: 'تم تأكيد وجود البائع' };
  }

  async startTrade(userId: string, dto: StartTradeDto) {
    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, isSuspended: true, trc20Wallet: true, bscWallet: true, fullName: true },
    });
    
    if (!buyer) throw new NotFoundException('المستخدم غير موجود');
    if (buyer.isSuspended) throw new ForbiddenException('حسابك موقوف');
    if (buyer.kycStatus !== 'approved') throw new BadRequestException('يجب إكمال توثيق الهوية أولاً');
    if (!buyer.trc20Wallet && !buyer.bscWallet) {
      throw new BadRequestException('يرجى إضافة عنوان محفظة USDT أولاً');
    }

    const offer = await this.prisma.offer.findFirst({
      where: { id: dto.offerId, status: 'active' },
      include: { seller: true },
    });
    
    if (!offer) throw new NotFoundException('العرض غير موجود');

    const exchangeRateRecord = await this.prisma.exchangeRate.findFirst();
    if (!exchangeRateRecord) {
      throw new BadRequestException('سعر الصرف غير متوفر حالياً، يرجى المحاولة لاحقاً');
    }
    const baseRate = Number(exchangeRateRecord.usdToIls);
    
    const premiumPercent = offer.premiumPercent ? Number(offer.premiumPercent) : 0;
    
    let livePrice: number;
    if (offer.fiatCurrency === 'usd') {
      livePrice = 1 * (1 + premiumPercent / 100);
    } else {
      livePrice = baseRate * (1 + premiumPercent / 100);
    }
    
    if (isNaN(livePrice) || livePrice <= 0) {
      throw new BadRequestException('خطأ في حساب السعر، يرجى المحاولة لاحقاً');
    }
    
    const minAmount = Number(offer.minAmount);
    const maxAmount = Number(offer.maxAmount);
    
    if (dto.amountUsdt < minAmount) {
      throw new BadRequestException(`المبلغ أقل من الحد الأدنى (${minAmount} USDT)`);
    }
    if (dto.amountUsdt > maxAmount) {
      throw new BadRequestException(`المبلغ أكبر من الحد الأقصى (${maxAmount} USDT)`);
    }

    const platformFee = dto.amountUsdt * 0.01;
    
    let networkFee = 0;
    if (offer.network === 'trc20') {
      const trc20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'TRC20' } });
      networkFee = trc20Fee?.feeAmount || 0;
      if (networkFee === 0) {
        throw new BadRequestException('رسوم شبكة TRC20 غير متوفرة حالياً، يرجى المحاولة لاحقاً');
      }
    } else {
      const bep20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
      networkFee = bep20Fee?.feeAmount || 0;
      if (networkFee === 0) {
        throw new BadRequestException('رسوم شبكة BEP20 غير متوفرة حالياً، يرجى المحاولة لاحقاً');
      }
    }
    
    const netAmountToBuyer = dto.amountUsdt - platformFee - networkFee;
    const totalFiat = dto.amountUsdt * livePrice;
    
    const deadline = new Date(Date.now() + 30 * 60 * 1000);
    
    const trade = await this.prisma.trade.create({
      data: {
        tradeReference: `TRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        sellerId: offer.sellerId,
        buyerId: userId,
        offerId: offer.id,
        amountUsdt: dto.amountUsdt,
        pricePerUsdt: livePrice,
        totalFiat: totalFiat,
        fiatCurrency: offer.fiatCurrency,
        network: offer.network,
        status: 'waiting_seller_deposit',
        platformFee: platformFee,
        networkFee: networkFee,
        netAmountToBuyer: netAmountToBuyer,
        expiresAt: deadline,
      },
    });

    try {
      const escrowAddress = await this.walletService.createEscrowAddress(trade.id, offer.network as 'trc20' | 'bep20');
      this.logger.log(`✅ Created escrow address for trade ${trade.id}: ${escrowAddress}`);
    } catch (error) {
      this.logger.error(`Failed to create escrow address: ${error.message}`);
    }

    this.scheduleExpiryHandler(trade.id, deadline);

    this.tradeGateway.sendToUser(offer.sellerId, 'trade:update', {
      tradeId: trade.id,
      status: 'waiting_seller_deposit',
      message: `🆕 صفقة جديدة بمبلغ ${dto.amountUsdt} USDT. يرجى إرسال USDT خلال 30 دقيقة.`,
      amount: dto.amountUsdt,
      buyerName: buyer.fullName,
    });

    await this.mailService.sendEmail({
      to: offer.seller.email,
      subject: '🆕 صفقة جديدة - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${offer.seller.fullName}</h2>
      <p>لديك صفقة جديدة بمبلغ ${dto.amountUsdt} USDT.</p>
      <p>السعر: ${livePrice.toFixed(4)} ${offer.fiatCurrency === 'ils' ? '₪' : '$'}</p>
      <p>المبلغ الإجمالي للتحويل: ${totalFiat.toFixed(2)} ${offer.fiatCurrency === 'ils' ? '₪' : '$'}</p>
      <p>لديك 30 دقيقة لإرسال USDT إلى عنوان الضمان.</p></div>`,
    });

    return { success: true, message: 'تم بدء الصفقة بنجاح', trade };
  }

  async getUserTrades(userId: string, page: number, limit: number, status?: string) {
    const where: any = { OR: [{ sellerId: userId }, { buyerId: userId }] };
    if (status) where.status = status;

    const trades = await this.prisma.trade.findMany({
      where,
      include: {
        seller: { select: { id: true, fullName: true } },
        buyer: { select: { id: true, fullName: true } },
        offer: true,
        paymentProof: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.trade.count({ where });
    return { data: trades, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getTradeById(tradeId: string, userId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, OR: [{ sellerId: userId }, { buyerId: userId }] },
      include: {
        seller: { select: { id: true, fullName: true, phone: true } },
        buyer: { select: { id: true, fullName: true, phone: true, trc20Wallet: true, bscWallet: true } },
        offer: true,
        paymentProof: true,
        dispute: true,
      },
    });
    
    if (!trade) throw new NotFoundException('الصفقة غير موجودة');
    
    let currentNetworkFee = Number(trade.networkFee);
    try {
      if (trade.network === 'trc20') {
        const trc20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'TRC20' } });
        if (trc20Fee && trc20Fee.feeAmount > 0) {
          currentNetworkFee = trc20Fee.feeAmount;
        }
      } else {
        const bep20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
        if (bep20Fee && bep20Fee.feeAmount > 0) {
          currentNetworkFee = bep20Fee.feeAmount;
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to get current network fee: ${error.message}`);
    }
    
    const amount = Number(trade.amountUsdt);
    const platformFee = amount * 0.01;
    const netAmountToBuyer = amount - platformFee - currentNetworkFee;
    const totalFiat = amount * Number(trade.pricePerUsdt);
    
    let timeLeft = '';
    let hasExpired = false;
    if (trade.expiresAt) {
      const remaining = trade.expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        timeLeft = 'انتهت المهلة';
        hasExpired = true;
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timeLeft = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    return {
      ...trade,
      networkFee: currentNetworkFee,
      netAmountToBuyer: netAmountToBuyer,
      platformFee: platformFee,
      totalFiat: totalFiat,
      timeLeft,
      hasExpired,
    };
  }

  async submitPaymentProof(
    tradeId: string, 
    userId: string, 
    dto: SubmitPaymentProofDto,
    imagePath: string | null
  ) {
    const trade = await this.prisma.trade.findFirst({ 
      where: { id: tradeId, buyerId: userId },
      include: { seller: true }
    });
    
    if (!trade) throw new NotFoundException('الصفقة غير موجودة');
    
    if (trade.expiresAt && new Date(trade.expiresAt) < new Date()) {
      throw new BadRequestException('انتهت المهلة! لا يمكنك رفع إثبات الدفع.');
    }
    
    if (trade.status !== 'active') {
      throw new BadRequestException(`لا يمكن رفع إثبات الدفع. الحالة: ${this.getStatusText(trade.status)}`);
    }
    if (!imagePath) throw new BadRequestException('صورة الإثبات مطلوبة');

    await this.prisma.paymentProof.create({
      data: {
        tradeId,
        buyerId: userId,
        imageUrl: imagePath,
        transactionRef: dto.transactionRef,
        transferTime: new Date(),
        bankName: dto.bankName,
        last4Digits: dto.last4Digits,
      },
    });

    await this.prisma.trade.update({
      where: { id: tradeId },
      data: { status: 'waiting_seller_confirmation' },
    });

    this.tradeGateway.sendPaymentProofNotification(tradeId, userId, trade.sellerId);
    this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
      tradeId,
      status: 'waiting_seller_confirmation',
      message: `📎 تم رفع إثبات الدفع، يرجى تأكيد استلام المبلغ`,
    });

    if (trade.seller) {
      await this.mailService.sendEmail({
        to: trade.seller.email,
        subject: '📎 تم رفع إثبات الدفع - PalEscrow',
        html: `<div dir="rtl"><h2>مرحباً ${trade.seller.fullName}</h2>
        <p>قام المشتري برفع إثبات الدفع. يرجى تأكيد استلام المبلغ.</p>
        <p>لديك حتى ${trade.expiresAt ? new Date(trade.expiresAt).toLocaleString() : 'انتهت المهلة'} لتأكيد الاستلام.</p></div>`,
      });
    }

    return { success: true, message: 'تم رفع إثبات الدفع بنجاح' };
  }

  async confirmPayment(tradeId: string, userId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, sellerId: userId, status: 'waiting_seller_confirmation' },
      include: { buyer: true, offer: true },
    });
    
    if (!trade) throw new NotFoundException('الصفقة غير موجودة');
    
    if (trade.expiresAt && new Date(trade.expiresAt) < new Date()) {
      throw new BadRequestException('انتهت المهلة! لا يمكنك تأكيد الدفع.');
    }

    const buyerWallet = trade.buyer.trc20Wallet || trade.buyer.bscWallet;
    if (!buyerWallet) {
      throw new BadRequestException('المشتري لم يحدد عنوان محفظته بعد');
    }
    
    const network = buyerWallet.startsWith('0x') ? 'bep20' : 'trc20';
    
    let currentNetworkFee = Number(trade.networkFee);
    if (network === 'trc20') {
      const trc20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'TRC20' } });
      if (trc20Fee && trc20Fee.feeAmount > 0) {
        currentNetworkFee = trc20Fee.feeAmount;
      }
    } else {
      const bep20Fee = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
      if (bep20Fee && bep20Fee.feeAmount > 0) {
        currentNetworkFee = bep20Fee.feeAmount;
      }
    }
    
    const amount = Number(trade.amountUsdt);
    const platformFee = amount * 0.01;
    const netAmount = amount - platformFee - currentNetworkFee;
    
    if (netAmount <= 0) {
      throw new BadRequestException('المبلغ صغير جداً بعد الخصومات');
    }
    
    const releaseResult = await this.walletService.releaseToBuyer(tradeId, buyerWallet, network);
    
    if (!releaseResult.success) {
      throw new BadRequestException(releaseResult.error || 'فشل في تحرير USDT');
    }

    this.cancelExpiryTimeout(tradeId);

    await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        releaseTxHash: releaseResult.txHash,
        networkFee: currentNetworkFee,
        netAmountToBuyer: netAmount,
      },
    });

    await this.prisma.user.update({
      where: { id: trade.sellerId },
      data: { totalTrades: { increment: 1 } },
    });

    await this.prisma.user.update({
      where: { id: trade.buyerId },
      data: { totalTrades: { increment: 1 } },
    });

    await this.prisma.offer.update({
      where: { id: trade.offerId },
      data: {
        escrowBalance: { decrement: trade.amountUsdt },
        reservedBalance: { decrement: trade.amountUsdt },
      },
    });

this.tradeGateway.sendConfirmationNotification(tradeId, userId, trade.buyerId, releaseResult.txHash || '');
    this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
      tradeId,
      status: 'completed',
      message: `✅ تم تأكيد استلام المبلغ وتحرير USDT إلى محفظتك`,
    });

    await this.mailService.sendEmail({
      to: trade.buyer.email,
      subject: '🎉 تم تحرير USDT - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${trade.buyer.fullName}</h2>
      <p>تم تحرير ${netAmount.toFixed(2)} USDT إلى محفظتك.</p>
      <p>رقم المعاملة: ${releaseResult.txHash}</p></div>`,
    });

    return { success: true, message: 'تم تأكيد الدفع وإتمام الصفقة', txHash: releaseResult.txHash };
  }

  async cancelTrade(tradeId: string, userId: string) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, status: 'waiting_seller_deposit', OR: [{ sellerId: userId }, { buyerId: userId }] },
    });
    
    if (!trade) throw new NotFoundException('الصفقة غير موجودة');

    this.cancelExpiryTimeout(tradeId);

    await this.prisma.trade.update({ where: { id: tradeId }, data: { status: 'cancelled' } });
    await this.prisma.offer.update({
      where: { id: trade.offerId },
      data: { reservedBalance: { decrement: trade.amountUsdt } },
    });

    return { success: true, message: 'تم إلغاء الصفقة' };
  }

  async mockDeposit(tradeId: string, userId: string) {
    this.logger.log(`🧪 Mock deposit requested for trade ${tradeId}`);
    
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, status: 'waiting_seller_deposit' },
    });
    
    if (!trade) throw new BadRequestException('الصفقة غير موجودة');
    
    await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'active',
        sellerDepositTxHash: `MOCK_${Date.now()}`,
        escrowBalance: trade.amountUsdt,
      },
    });
    
    this.tradeGateway.sendDepositNotification(tradeId, trade.sellerId, trade.buyerId, Number(trade.amountUsdt), `MOCK_${Date.now()}`);
    
    return { success: true, message: 'تم محاكاة الإيداع بنجاح' };
  }

  async mockRelease(tradeId: string, userId: string, buyerAddress: string) {
    this.logger.log(`🧪 Mock release requested for trade ${tradeId}`);
    
    const trade = await this.prisma.trade.findFirst({
      where: { id: tradeId, status: 'active' },
    });
    
    if (!trade) throw new BadRequestException('الصفقة غير موجودة');
    
    const amount = Number(trade.amountUsdt);
    const platformFee = amount * 0.01;
    const networkFee = Number(trade.networkFee);
    const netAmount = amount - platformFee - networkFee;
    
    await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        releaseTxHash: `MOCK_${Date.now()}`,
      },
    });
    
    return { success: true, message: 'تم محاكاة تحرير USDT بنجاح', netAmount };
  }
}