import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';
import { WalletService } from '../wallet/wallet.service';
import { EncryptionService } from '../../shared/services/encryption.service';
import { TronNodeService } from '../../shared/services/tron-node.service';
import { BscWalletService } from '../blockchain/bsc-wallet.service';
import { TradeGateway } from '../trade/trade.gateway';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private walletService: WalletService,
    private encryption: EncryptionService,
    private tronNode: TronNodeService,
    private bscWallet: BscWalletService,
    private tradeGateway: TradeGateway,
  ) {}

  async openDispute(userId: string, dto: OpenDisputeDto) {
    const trade = await this.prisma.trade.findFirst({
      where: { id: dto.tradeId, OR: [{ sellerId: userId }, { buyerId: userId }] },
      include: { 
        seller: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            phone: true 
          } 
        },
        buyer: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true, 
            phone: true 
          } 
        },
        paymentProof: true, // ✅ تم الإصلاح: إضافة paymentProof إلى الـ include
      },
    });
    
    if (!trade) {
      throw new NotFoundException('الصفقة غير موجودة');
    }

    if (trade.status !== 'waiting_seller_confirmation') {
      throw new BadRequestException('يمكن فتح نزاع فقط في مرحلة تأكيد البائع');
    }

    if (trade.sellerId !== userId) {
      throw new ForbiddenException('فقط البائع يمكنه فتح نزاع');
    }

    const existingDispute = await this.prisma.dispute.findUnique({
      where: { tradeId: dto.tradeId } 
    });
    
    if (existingDispute) {
      if (existingDispute.status === 'resolved') {
        throw new BadRequestException('لا يمكن فتح نزاع جديد، هذا النزاع تم حله سابقاً');
      }
      throw new BadRequestException('يوجد نزاع مفتوح بالفعل لهذه الصفقة');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (user && user.fraudulentDisputeCount >= 5) {
      throw new ForbiddenException('لقد تجاوزت الحد المسموح من النزاعات (5 نزاعات). يرجى مراجعة الدعم الفني.');
    }

    // ✅ إنشاء tradeSnapshot كامل لحفظ حالة الصفقة وقت النزاع
    const tradeSnapshot = {
      tradeReference: trade.tradeReference,
      amountUsdt: Number(trade.amountUsdt),
      pricePerUsdt: Number(trade.pricePerUsdt),
      totalFiat: Number(trade.totalFiat),
      fiatCurrency: trade.fiatCurrency,
      network: trade.network,
      status: trade.status,
      createdAt: trade.createdAt,
      expiresAt: trade.expiresAt,
      platformFee: Number(trade.platformFee),
      networkFee: Number(trade.networkFee),
      netAmountToBuyer: Number(trade.netAmountToBuyer),
      seller: {
        id: trade.seller.id,
        fullName: trade.seller.fullName,
        email: trade.seller.email,
        phone: trade.seller.phone,
      },
      buyer: {
        id: trade.buyer.id,
        fullName: trade.buyer.fullName,
        email: trade.buyer.email,
        phone: trade.buyer.phone,
      },
      paymentProof: trade.paymentProof ? {
        transactionRef: trade.paymentProof.transactionRef,
        bankName: trade.paymentProof.bankName,
        last4Digits: trade.paymentProof.last4Digits,
        transferTime: trade.paymentProof.transferTime,
      } : null,
    };

    const dispute = await this.prisma.dispute.create({
      data: {
        tradeId: dto.tradeId,
        openedByUserId: userId,
        reason: dto.reason,
        description: dto.description,
        evidenceUrls: dto.evidenceUrls || [],
        status: 'opened',
        evidenceDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
        tradeSnapshot: tradeSnapshot,
      },
    });

    await this.prisma.trade.update({
      where: { id: dto.tradeId },
      data: { status: 'dispute_opened' },
    });

    // ✅ إعلام الطرفين عبر WebSocket
    this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
      tradeId: dto.tradeId,
      status: 'dispute_opened',
      message: `⚠️ تم فتح نزاع على الصفقة: ${dto.reason}`,
    });
    this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
      tradeId: dto.tradeId,
      status: 'dispute_opened',
      message: `⚠️ تم فتح نزاع على الصفقة: ${dto.reason}`,
    });

    await this.mailService.sendEmail({
      to: trade.seller.email,
      subject: '⚠️ تم فتح نزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${trade.seller.fullName}</h2>
          <p>تم فتح نزاع على الصفقة ${trade.tradeReference}.</p>
          <p><strong>سبب النزاع:</strong> ${dto.reason}</p>
          <p><strong>المبلغ:</strong> ${trade.amountUsdt} USDT</p>
          <p>يرجى مراجعة لوحة التحكم للاطلاع على التفاصيل وتقديم دفاعك.</p>
          <p>لديك 24 ساعة لتقديم الأدلة.</p>
        </div>
      `,
    });

    await this.mailService.sendEmail({
      to: trade.buyer.email,
      subject: '⚠️ تم فتح نزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${trade.buyer.fullName}</h2>
          <p>تم فتح نزاع على الصفقة ${trade.tradeReference}.</p>
          <p><strong>سبب النزاع:</strong> ${dto.reason}</p>
          <p><strong>المبلغ:</strong> ${trade.amountUsdt} USDT</p>
          <p>يرجى مراجعة لوحة التحكم للاطلاع على التفاصيل وتقديم أدلتك.</p>
          <p>لديك 24 ساعة لتقديم الأدلة.</p>
        </div>
      `,
    });

    this.logger.log(`Dispute opened for trade ${trade.tradeReference} by user ${userId}`);

    return { 
      success: true, 
      message: 'تم فتح النزاع بنجاح', 
      disputeId: dispute.id 
    };
  }

  async getUserDisputes(userId: string, page: number, limit: number) {
    const disputes = await this.prisma.dispute.findMany({
      where: {
        OR: [
          { trade: { sellerId: userId } },
          { trade: { buyerId: userId } },
          { openedByUserId: userId },
        ],
      },
      include: {
        trade: { 
          select: { 
            id: true, 
            tradeReference: true, 
            amountUsdt: true 
          } 
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.dispute.count({
      where: {
        OR: [
          { trade: { sellerId: userId } },
          { trade: { buyerId: userId } },
          { openedByUserId: userId },
        ],
      },
    });

    return { 
      data: disputes, 
      meta: { 
        page, 
        limit, 
        total, 
        totalPages: Math.ceil(total / limit) 
      } 
    };
  }

  async getDispute(disputeId: string, userId: string) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id: disputeId,
        OR: [
          { trade: { sellerId: userId } },
          { trade: { buyerId: userId } },
          { openedByUserId: userId },
        ],
      },
      include: {
        trade: { 
          include: { 
            seller: { 
              select: { id: true, fullName: true, email: true } 
            }, 
            buyer: { 
              select: { id: true, fullName: true, email: true } 
            } 
          } 
        },
        openedBy: { 
          select: { id: true, fullName: true, email: true } 
        },
        resolvedBy: { 
          select: { id: true, fullName: true } 
        },
      },
    });
    
    if (!dispute) {
      throw new NotFoundException('النزاع غير موجود');
    }
    
    return dispute;
  }

  async addEvidence(disputeId: string, userId: string, dto: AddEvidenceDto) {
    const dispute = await this.prisma.dispute.findFirst({
      where: {
        id: disputeId,
        OR: [
          { trade: { sellerId: userId } },
          { trade: { buyerId: userId } },
        ],
      },
    });
    
    if (!dispute) {
      throw new NotFoundException('النزاع غير موجود');
    }
    
    if (dispute.status !== 'opened') {
      throw new BadRequestException('لا يمكن إضافة أدلة في هذه المرحلة. النزاع إما تم حله أو انتهت مهلة تقديم الأدلة.');
    }

    const currentEvidence = (dispute.evidenceUrls as string[]) || [];
    const updatedEvidence = [...currentEvidence, ...(dto.evidenceUrls || [])];

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: { evidenceUrls: updatedEvidence },
    });

    return { success: true, message: 'تم إضافة الأدلة بنجاح' };
  }

  async resolveDispute(disputeId: string, adminId: string, adminName: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { 
        trade: { 
          include: { 
            seller: true, 
            buyer: true 
          } 
        } 
      },
    });
    
    if (!dispute) {
      throw new NotFoundException('النزاع غير موجود');
    }
    
    if (dispute.status === 'resolved') {
      throw new BadRequestException('النزاع تم حله مسبقاً');
    }

    const isFraudulent = dispute.reason === 'fake_payment_proof' && dto.resolution === 'refund_to_seller';
    
    if (isFraudulent) {
      await this.prisma.user.update({
        where: { id: dispute.openedByUserId },
        data: { fraudulentDisputeCount: { increment: 1 } },
      });
    }

    let resolutionMessage = '';
    let tradeStatus = '';
    
    if (dto.resolution === 'release_to_buyer') {
      tradeStatus = 'completed';
      resolutionMessage = 'تم تحرير USDT للمشتري';
    } else if (dto.resolution === 'refund_to_seller') {
      tradeStatus = 'refunded';
      resolutionMessage = 'تم إعادة USDT إلى البائع';
    } else {
      throw new BadRequestException('قرار الحل غير صالح. اختر "تحرير USDT للمشتري" أو "إعادة USDT إلى البائع"');
    }

    await this.prisma.trade.update({
      where: { id: dispute.tradeId },
      data: { status: tradeStatus },
    });

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution: dto.resolution,
        resolutionNotes: dto.resolutionNotes,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ disputeId, resolution: dto.resolution }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'RESOLVE_DISPUTE',
        targetUserId: dispute.openedByUserId,
        metadata: { 
          disputeId, 
          resolution: dto.resolution, 
          resolutionNotes: dto.resolutionNotes 
        },
        hash,
      },
    });

    await this.mailService.sendEmail({
      to: dispute.trade.seller.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${dispute.trade.seller.fullName}</h2>
          <p>تم حل النزاع على الصفقة ${dispute.trade.tradeReference}.</p>
          <p><strong>القرار:</strong> ${resolutionMessage}</p>
          ${dto.resolutionNotes ? `<p><strong>ملاحظات:</strong> ${dto.resolutionNotes}</p>` : ''}
        </div>
      `,
    });

    await this.mailService.sendEmail({
      to: dispute.trade.buyer.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${dispute.trade.buyer.fullName}</h2>
          <p>تم حل النزاع على الصفقة ${dispute.trade.tradeReference}.</p>
          <p><strong>القرار:</strong> ${resolutionMessage}</p>
          ${dto.resolutionNotes ? `<p><strong>ملاحظات:</strong> ${dto.resolutionNotes}</p>` : ''}
        </div>
      `,
    });

    this.logger.log(`Dispute ${disputeId} resolved by ${adminName}: ${dto.resolution}`);

    return { 
      success: true, 
      message: 'تم حل النزاع بنجاح', 
      resolution: dto.resolution 
    };
  }

  // ==================== دوال معالجة النزاع بالقواعد الجديدة ====================

  async resolveDisputeByAdmin(
    disputeId: string, 
    adminId: string, 
    adminName: string, 
    decision: 'release_to_buyer' | 'refund_to_seller' | 'cancel_trade',
    notes?: string
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { 
        trade: { 
          include: { 
            seller: true, 
            buyer: true,
            paymentProof: true 
          } 
        } 
      },
    });
    
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (dispute.status === 'resolved') throw new BadRequestException('النزاع تم حله مسبقاً');

    let resolutionMessage = '';
    let tradeStatus = '';
    let sellerBanned = false;
    let buyerBanned = false;

    switch (decision) {
      case 'release_to_buyer':
        tradeStatus = 'completed';
        resolutionMessage = 'تم تحرير USDT للمشتري بعد التحقق من صحة إثبات الدفع';
        
        const buyerWallet = dispute.trade.buyer.trc20Wallet || dispute.trade.buyer.bscWallet;
        if (buyerWallet) {
          const network = buyerWallet.startsWith('0x') ? 'bep20' : 'trc20';
          await this.walletService.releaseToBuyer(dispute.tradeId, buyerWallet, network);
        }
        break;
        
      case 'refund_to_seller':
        tradeStatus = 'refunded';
        resolutionMessage = 'تم إعادة USDT إلى البائع بعد التحقق من عدم صحة إثبات الدفع';
        
        const sellerWallet = dispute.trade.seller.trc20Wallet || dispute.trade.seller.bscWallet;
        if (sellerWallet && dispute.trade.escrowPrivateKey) {
          const privateKey = this.encryption.decrypt(dispute.trade.escrowPrivateKey);
          const amount = Number(dispute.trade.amountUsdt);
          const platformFee = amount * 0.01;
          let networkFee = Number(dispute.trade.networkFee);
          
          if (networkFee === 0) {
            networkFee = await this.walletService.getNetworkFee(dispute.trade.network as 'trc20' | 'bep20');
          }
          
          const netAmount = amount - platformFee - networkFee;
          const network2 = sellerWallet.startsWith('0x') ? 'bep20' : 'trc20';
          
          if (network2 === 'trc20') {
            await this.tronNode.sendUsdt(privateKey, sellerWallet, netAmount);
          } else {
            await this.bscWallet.sendUsdt(privateKey, sellerWallet, netAmount);
          }
        }
        
        if (!dispute.trade.paymentProof) {
          await this.prisma.user.update({
            where: { id: dispute.trade.buyerId },
            data: { isSuspended: true, suspensionReason: 'فتح نزاع بدون إثبات دفع' },
          });
          buyerBanned = true;
        }
        break;
        
      case 'cancel_trade':
        tradeStatus = 'cancelled';
        resolutionMessage = 'تم إلغاء الصفقة لعدم وجود إثبات دفع صحيح';
        break;
    }

    await this.prisma.trade.update({
      where: { id: dispute.tradeId },
      data: { status: tradeStatus },
    });

    await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'resolved',
        resolution: decision,
        resolutionNotes: notes || resolutionMessage,
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
      },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ disputeId, decision }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'RESOLVE_DISPUTE',
        targetUserId: dispute.openedByUserId,
        metadata: { 
          disputeId, 
          decision,
          notes,
          sellerBanned,
          buyerBanned,
        },
        hash,
      },
    });

    await this.mailService.sendEmail({
      to: dispute.trade.seller.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${dispute.trade.seller.fullName}</h2>
          <p>تم حل النزاع على الصفقة ${dispute.trade.tradeReference}.</p>
          <p><strong>القرار:</strong> ${resolutionMessage}</p>
          ${notes ? `<p><strong>ملاحظات الإدارة:</strong> ${notes}</p>` : ''}
          ${sellerBanned ? '<p class="text-red-500">⚠️ تم حظر حسابك بسبب عدم التعاون مع الإدارة.</p>' : ''}
        </div>
      `,
    });

    await this.mailService.sendEmail({
      to: dispute.trade.buyer.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `
        <div dir="rtl">
          <h2>مرحباً ${dispute.trade.buyer.fullName}</h2>
          <p>تم حل النزاع على الصفقة ${dispute.trade.tradeReference}.</p>
          <p><strong>القرار:</strong> ${resolutionMessage}</p>
          ${notes ? `<p><strong>ملاحظات الإدارة:</strong> ${notes}</p>` : ''}
          ${buyerBanned ? '<p class="text-red-500">⚠️ تم حظر حسابك بسبب فتح نزاع وهمي.</p>' : ''}
        </div>
      `,
    });

    this.logger.log(`Dispute ${disputeId} resolved by ${adminName}: ${decision}`);

    return { 
      success: true, 
      message: 'تم حل النزاع بنجاح', 
      decision,
      sellerBanned,
      buyerBanned,
    };
  }

  async banSellerForNonCooperation(disputeId: string, adminId: string, adminName: string, reason: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { trade: { include: { seller: true } } },
    });
    
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    
    await this.prisma.user.update({
      where: { id: dispute.trade.sellerId },
      data: {
        isSuspended: true,
        suspensionReason: reason || 'عدم التعاون مع إدارة المنصة في حل النزاع',
        suspendedUntil: null,
      },
    });
    
    await this.resolveDisputeByAdmin(disputeId, adminId, adminName, 'release_to_buyer', 'تم حظر البائع بسبب عدم التعاون وتحرير USDT للمشتري');
    
    return { success: true, message: 'تم حظر البائع وتحرير USDT للمشتري' };
  }
}