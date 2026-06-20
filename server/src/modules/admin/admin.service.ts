import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  // ==================== Dashboard Stats ====================
  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, totalTradesToday, activeTrades, openDisputes, pendingKyc, totalVolume, usdtInEscrow] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trade.count({ where: { createdAt: { gte: today } } }),
      this.prisma.trade.count({ where: { status: 'active' } }),
      this.prisma.dispute.count({ where: { status: 'opened' } }),
      this.prisma.kycRequest.count({ where: { status: 'pending' } }),
      this.prisma.trade.aggregate({ where: { createdAt: { gte: today } }, _sum: { amountUsdt: true } }),
      this.prisma.offer.aggregate({ _sum: { escrowBalance: true } }),
    ]);

    return {
      totalUsers,
      totalTradesToday,
      activeTrades,
      openDisputes,
      pendingKyc,
      totalVolumeToday: totalVolume._sum.amountUsdt || 0,
      usdtInEscrow: usdtInEscrow._sum.escrowBalance || 0,
    };
  }

  // ==================== Users Management ====================
  async getAllUsers(page: number, limit: number, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        kycStatus: true,
        trustLevel: true,
        totalTrades: true,
        isSuspended: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.user.count({ where });
    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        kycStatus: true,
        trustLevel: true,
        totalTrades: true,
        successRate: true,
        averageRating: true,
        trc20Wallet: true,
        bscWallet: true,
        isSuspended: true,
        suspensionReason: true,
        suspendedUntil: true,
        createdAt: true,
      },
    });
    
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async suspendUser(userId: string, adminId: string, adminName: string, dto: SuspendUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspensionReason: dto.reason,
        suspendedUntil: null,
      },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ userId, reason: dto.reason, days: dto.days }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'SUSPEND_USER',
        targetUserId: userId,
        metadata: { reason: dto.reason, days: dto.days },
        hash,
      },
    });

    await this.mailService.sendEmail({
      to: user.email,
      subject: '🚫 تم تجميد حسابك - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${user.fullName}</h2><p>تم تجميد حسابك لمدة ${dto.days} أيام. السبب: ${dto.reason}</p></div>`,
    });

    return { success: true, message: `تم تجميد المستخدم لمدة ${dto.days} أيام` };
  }

  async unsuspendUser(userId: string, adminId: string, adminName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.prisma.user.update({
      where: { id: userId },
      data: { isSuspended: false, suspensionReason: null, suspendedUntil: null },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ userId }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'UNSUSPEND_USER',
        targetUserId: userId,
        hash,
      },
    });

    await this.mailService.sendEmail({
      to: user.email,
      subject: '✅ تم رفع التجميد عن حسابك - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${user.fullName}</h2><p>تم رفع التجميد عن حسابك. يمكنك الآن التداول مرة أخرى.</p></div>`,
    });

    return { success: true, message: 'تم رفع التجميد عن المستخدم' };
  }

  async deleteUser(userId: string, adminId: string, adminName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ userId, action: 'DELETE_USER' }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'DELETE_USER',
        targetUserId: userId,
        metadata: {
          deletedUser: {
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
          },
        },
        hash,
      },
    });

    await this.prisma.user.delete({ where: { id: userId } });

    return { success: true, message: 'تم حذف المستخدم بنجاح' };
  }

  // ==================== KYC Management ====================
  async getPendingKyc(page: number, limit: number) {
    const requests = await this.prisma.kycRequest.findMany({
      where: { status: 'pending' },
      include: { 
        user: { 
          select: { id: true, fullName: true, email: true } 
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountHolderName: true,
            proofImageUrl: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.kycRequest.count({ where: { status: 'pending' } });
    return { data: requests, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getKycRequestById(requestId: string) {
    const request = await this.prisma.kycRequest.findUnique({
      where: { id: requestId },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        bankAccount: true,
      },
    });
    if (!request) throw new NotFoundException('طلب التوثيق غير موجود');
    return request;
  }

  async resetUserKycStatus(userId: string, adminId: string, adminName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'none' },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ userId, action: 'RESET_KYC' }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'RESET_KYC_STATUS',
        targetUserId: userId,
        hash,
      },
    });

    return { success: true, message: 'تم إعادة تعيين حالة KYC للمستخدم' };
  }

  async approveKyc(requestId: string, adminId: string, adminName: string) {
    const request = await this.prisma.kycRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('الطلب غير موجود');

    await this.prisma.$transaction([
      this.prisma.kycRequest.update({
        where: { id: requestId },
        data: { status: 'approved', reviewedBy: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { kycStatus: 'approved' },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { id: request.userId } });
    if (user) {
      await this.mailService.sendEmail({
        to: user.email,
        subject: '✅ تم قبول طلب التوثيق - PalEscrow',
        html: `<div dir="rtl"><h2>مرحباً ${user.fullName}</h2><p>تم قبول طلب توثيق الهوية الخاص بك. يمكنك الآن إنشاء عروض بيع.</p></div>`,
      });
    }

    return { success: true, message: 'تم قبول طلب التوثيق' };
  }

  async rejectKyc(requestId: string, adminId: string, adminName: string, reason: string) {
    const request = await this.prisma.kycRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException('الطلب غير موجود');

    await this.prisma.$transaction([
      this.prisma.kycRequest.update({
        where: { id: requestId },
        data: { status: 'rejected', rejectionReason: reason, reviewedBy: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { kycStatus: 'rejected' },
      }),
    ]);

    const user = await this.prisma.user.findUnique({ where: { id: request.userId } });
    if (user) {
      await this.mailService.sendEmail({
        to: user.email,
        subject: '❌ تم رفض طلب التوثيق - PalEscrow',
        html: `<div dir="rtl"><h2>مرحباً ${user.fullName}</h2><p>تم رفض طلب توثيق الهوية. السبب: ${reason}</p><p>يمكنك إعادة التقديم بعد تصحيح البيانات.</p></div>`,
      });
    }

    return { success: true, message: 'تم رفض طلب التوثيق' };
  }

  // ==================== Exchange Rate ====================
  async updateExchangeRate(usdToIls: number, adminId: string, adminName: string) {
    await this.prisma.exchangeRate.deleteMany();
    await this.prisma.exchangeRate.create({ data: { usdToIls } });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ usdToIls }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'UPDATE_EXCHANGE_RATE',
        metadata: { usdToIls },
        hash,
      },
    });

    return { success: true, message: 'تم تحديث سعر الصرف', rate: usdToIls };
  }

  async getExchangeRate() {
    const rate = await this.prisma.exchangeRate.findFirst();
    return {
      rate: rate ? Number(rate.usdToIls) : 3.50,
      lastUpdated: rate?.updatedAt || new Date(),
    };
  }

  // ==================== Network Fees Management ====================
  
  async getAllNetworkFees() {
    const fees = await this.prisma.networkFee.findMany();
    return {
      trc20: fees.find(f => f.network === 'TRC20')?.feeAmount || 1.5,
      bep20: fees.find(f => f.network === 'BEP20')?.feeAmount || 0.5,
    };
  }

  async getNetworkFee(network: string) {
    const networkUpper = network.toUpperCase();
    const fee = await this.prisma.networkFee.findUnique({
      where: { network: networkUpper },
    });
    
    if (!fee) {
      throw new NotFoundException(`رسوم شبكة ${networkUpper} غير موجودة`);
    }
    
    return {
      network: fee.network,
      fee: fee.feeAmount,
      energyFee: fee.energyFee,
      lastUpdated: fee.updatedAt,
      expiresAt: fee.expiresAt,
    };
  }

  async updateNetworkFee(network: string, fee: number, adminId: string, adminName: string) {
    const networkUpper = network.toUpperCase();
    
    if (fee <= 0 || fee > 10) {
      throw new BadRequestException('رسوم الشبكة يجب أن تكون بين 0 و 10 دولار');
    }
    
    const updated = await this.prisma.networkFee.upsert({
      where: { network: networkUpper },
      update: { 
        feeAmount: fee, 
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
      create: {
        network: networkUpper,
        feeAmount: fee,
        energyFee: network === 'TRC20' ? 420 : 0,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ network, fee }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'UPDATE_NETWORK_FEE',
        metadata: { network, fee },
        hash,
      },
    });

    this.logger.log(`✅ تم تحديث رسوم ${network} إلى ${fee} USDT`);
    return { success: true, message: `تم تحديث رسوم ${network} إلى ${fee} USDT`, data: updated };
  }

  // ==================== Audit Logs ====================
  async getAuditLogs(page: number, limit: number) {
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.auditLog.count();
    return { data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ==================== Disputes Management ====================
  async getDisputes(page: number, limit: number) {
    const disputes = await this.prisma.dispute.findMany({
      include: {
        openedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.dispute.count();
    return { data: disputes, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getDisputeById(disputeId: string) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: {
        trade: {
          include: {
            seller: { select: { id: true, fullName: true, email: true, phone: true } },
            buyer: { select: { id: true, fullName: true, email: true, phone: true } },
            offer: true,
            paymentProof: true,
          },
        },
        openedBy: { select: { id: true, fullName: true, email: true } },
        resolvedBy: { select: { id: true, fullName: true } },
      },
    });
    
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    return dispute;
  }

  async resolveDispute(disputeId: string, adminId: string, adminName: string, dto: { resolution: string; resolutionNotes?: string }) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { trade: { include: { seller: true, buyer: true } } },
    });
    
    if (!dispute) throw new NotFoundException('النزاع غير موجود');
    if (dispute.status === 'resolved') throw new BadRequestException('النزاع تم حله مسبقاً');

    let resolutionMessage = '';
    
    if (dto.resolution === 'release_to_buyer') {
      await this.prisma.trade.update({
        where: { id: dispute.tradeId },
        data: { status: 'completed' },
      });
      resolutionMessage = 'تم تحرير USDT للمشتري';
    } else if (dto.resolution === 'refund_to_seller') {
      await this.prisma.trade.update({
        where: { id: dispute.tradeId },
        data: { status: 'refunded' },
      });
      resolutionMessage = 'تم إعادة USDT إلى البائع';
    } else {
      throw new BadRequestException('قرار الحل غير صالح');
    }

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
        metadata: { disputeId, resolution: dto.resolution, resolutionNotes: dto.resolutionNotes },
        hash,
      },
    });

    await this.mailService.sendEmail({
      to: dispute.trade.seller.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${dispute.trade.seller.fullName}</h2><p>${resolutionMessage}</p></div>`,
    });

    await this.mailService.sendEmail({
      to: dispute.trade.buyer.email,
      subject: '⚖️ تم حل النزاع - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${dispute.trade.buyer.fullName}</h2><p>${resolutionMessage}</p></div>`,
    });

    this.logger.log(`Dispute ${disputeId} resolved by ${adminName}: ${dto.resolution}`);
    return { success: true, message: 'تم حل النزاع بنجاح', resolution: dto.resolution };
  }

  // ==================== Trades Management ====================
  async getTrades(page: number, limit: number, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const trades = await this.prisma.trade.findMany({
      where,
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
        buyer: { select: { id: true, fullName: true, email: true } },
        offer: true,
        paymentProof: true,
        dispute: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.trade.count({ where });
    return { data: trades, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getTradeById(tradeId: string) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        seller: { select: { id: true, fullName: true, email: true, phone: true } },
        buyer: { select: { id: true, fullName: true, email: true, phone: true } },
        offer: true,
        paymentProof: true,
        dispute: true,
      },
    });
    
    if (!trade) throw new NotFoundException('الصفقة غير موجودة');
    return trade;
  }

  // ==================== Offers Management ====================
  async getAllOffers(page: number, limit: number, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const offers = await this.prisma.offer.findMany({
      where,
      include: {
        seller: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.offer.count({ where });
    return { data: offers, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async deleteOffer(offerId: string, adminId: string, adminName: string) {
    const offer = await this.prisma.offer.findUnique({ where: { id: offerId } });
    if (!offer) throw new NotFoundException('العرض غير موجود');

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ offerId, action: 'DELETE_OFFER' }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'DELETE_OFFER',
        targetUserId: offer.sellerId,
        metadata: { offerId },
        hash,
      },
    });

    await this.prisma.offer.delete({ where: { id: offerId } });
    return { success: true, message: 'تم حذف العرض بنجاح' };
  }

  // ==================== Notifications ====================
  async sendNotification(userId: string, title: string, message: string, type: string, adminId: string, adminName: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    const hash = crypto.createHash('sha256')
      .update(JSON.stringify({ userId, title, message }) + Date.now())
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action: 'SEND_NOTIFICATION',
        targetUserId: userId,
        metadata: { title, message, type },
        hash,
      },
    });

    return { success: true, message: 'تم إرسال الإشعار بنجاح', notification };
  }

  // ==================== Advanced Statistics ====================
  async getAdvancedStatistics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - 7));

    const [totalUsers, totalTrades, totalVolume, monthlyVolume, weeklyVolume, activeUsers, pendingDisputes, resolvedDisputes] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trade.count(),
      this.prisma.trade.aggregate({ _sum: { amountUsdt: true } }),
      this.prisma.trade.aggregate({ where: { createdAt: { gte: startOfMonth } }, _sum: { amountUsdt: true } }),
      this.prisma.trade.aggregate({ where: { createdAt: { gte: startOfWeek } }, _sum: { amountUsdt: true } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: startOfWeek } } }),
      this.prisma.dispute.count({ where: { status: 'opened' } }),
      this.prisma.dispute.count({ where: { status: 'resolved' } }),
    ]);

    return {
      totalUsers,
      totalTrades,
      totalVolume: totalVolume._sum.amountUsdt || 0,
      monthlyVolume: monthlyVolume._sum.amountUsdt || 0,
      weeklyVolume: weeklyVolume._sum.amountUsdt || 0,
      activeUsers,
      pendingDisputes,
      resolvedDisputes,
    };
  }
}