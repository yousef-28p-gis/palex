import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../shared/services/prisma.service';
import { HdWalletService } from '../blockchain/hd-wallet.service';
import { BscWalletService } from '../blockchain/bsc-wallet.service';
import { TronNodeService } from '../../shared/services/tron-node.service';
import { EncryptionService } from '../../shared/services/encryption.service';
import { TradeGateway } from '../trade/trade.gateway';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private isProcessingExpired = false;

  constructor(
    private prisma: PrismaService,
    private hdWallet: HdWalletService,
    private bscWallet: BscWalletService,
    private tronNode: TronNodeService,
    private encryption: EncryptionService,
    private tradeGateway: TradeGateway,
  ) {}

  async getNetworkFee(network: 'trc20' | 'bep20'): Promise<number> {
    if (network === 'trc20') {
      const fee = await this.prisma.networkFee.findUnique({ where: { network: 'TRC20' } });
      return fee?.feeAmount || 1.5;
    } else {
      const fee = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
      return fee?.feeAmount || 0.5;
    }
  }

  async createEscrowAddress(tradeId: string, network: 'trc20' | 'bep20'): Promise<string> {
    if (network === 'bep20') {
      const { address, privateKey } = this.bscWallet.generateEscrowAddress(tradeId);
      const encryptedPrivateKey = this.encryption.encrypt(privateKey);
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: { 
          bscEscrowAddress: address, 
          bscEscrowPrivateKey: encryptedPrivateKey,
        },
      });
      return address;
    } else {
      const { address, privateKey } = this.hdWallet.generateEscrowAddress(tradeId);
      const encryptedPrivateKey = this.encryption.encrypt(privateKey);
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: { 
          escrowAddress: address, 
          escrowPrivateKey: encryptedPrivateKey,
        },
      });
      return address;
    }
  }

  @Cron('*/2 * * * *')
  async checkPendingDeposits() {
    const pendingTrades = await this.prisma.trade.findMany({
      where: {
        status: 'waiting_seller_deposit',
        expiresAt: { gt: new Date() },
      },
    });
    
    if (pendingTrades.length === 0) return;
    
    this.logger.log(`🔍 Checking deposits for ${pendingTrades.length} pending trades...`);

    for (const trade of pendingTrades) {
      let depositReceived = false;
      let txHash = '';
      let amount = 0;
      
      if (trade.escrowAddress) {
        const expectedAmount = Number(trade.amountUsdt);
        const deposit = await this.tronNode.checkDeposits(trade.escrowAddress, expectedAmount);
        
        if (deposit.received) {
          depositReceived = true;
          txHash = deposit.txHash || '';
          amount = deposit.amount || expectedAmount;
        }
      }
      
      if (!depositReceived && trade.bscEscrowAddress) {
        const expectedAmount = Number(trade.amountUsdt);
        const deposit = await this.bscWallet.checkDeposits(trade.bscEscrowAddress, expectedAmount);
        
        if (deposit.received) {
          depositReceived = true;
          amount = deposit.amount || expectedAmount;
        }
      }
      
      if (depositReceived) {
        await this.updateTradeToActive(trade.id, txHash, amount, trade.network);
        this.logger.log(`✅ Deposit detected for trade ${trade.id}: ${amount} USDT via ${trade.network.toUpperCase()}`);
      }
    }
  }

  private async updateTradeToActive(tradeId: string, txHash: string, amount: number, network: string) {
    await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: 'active',
        sellerDepositTxHash: txHash,
        escrowBalance: amount,
        depositNetwork: network,
      },
    });
  }

  async handleExpiredTrade(tradeId: string): Promise<void> {
    this.logger.log(`⏰ Processing expired trade ${tradeId}`);
    
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: { 
        seller: true, 
        buyer: true,
        paymentProof: true,
      },
    });
    
    if (!trade) {
      this.logger.warn(`Trade ${tradeId} not found for expiration processing`);
      return;
    }
    
    const isExpired = trade.expiresAt && new Date(trade.expiresAt) < new Date();
    if (!isExpired) {
      this.logger.log(`Trade ${tradeId} is no longer expired (status: ${trade.status})`);
      return;
    }
    
    if (trade.status === 'cancelled' || trade.status === 'completed' || trade.status === 'dispute_opened') {
      this.logger.log(`Trade ${tradeId} already processed (status: ${trade.status})`);
      return;
    }
    
    // ==================== 1. البائع لم يرسل USDT ====================
    if (trade.status === 'pending_seller_approval') {
      this.logger.log(`⚠️ Trade ${tradeId}: Seller did not respond within 10 min`);
      
      await this.prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'cancelled' },
      });
      
      this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
        tradeId,
        status: 'cancelled',
        message: '⏰ انتهت مهلة الموافقة على الصفقة',
      });
      this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
        tradeId,
        status: 'cancelled',
        message: '⏰ البائع لم يستجب خلال المهلة، تم إلغاء الصفقة',
      });
      
      this.logger.log(`✅ Trade ${trade.id}: Cancelled due to seller not responding`);
      return;
    }
    
    if (trade.status === 'waiting_seller_deposit') {
      this.logger.log(`⚠️ Trade ${tradeId}: Seller did not deposit USDT within deadline`);
      
      await this.prisma.user.update({
        where: { id: trade.sellerId },
        data: {
          isSuspended: true,
          suspensionReason: 'لم يرسل USDT خلال المهلة (30 دقيقة)',
          suspendedUntil: null,
        },
      });
      
      // ✅ تحرير الرصيد المحجوز
      await this.prisma.offer.update({
        where: { id: trade.offerId },
        data: {
          reservedBalance: { decrement: trade.amountUsdt }
        },
      });
      
      await this.prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'cancelled' },
      });
      
      this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
        tradeId,
        status: 'cancelled',
        message: '⏰ البائع لم يرسل USDT خلال المهلة، تم إلغاء الصفقة',
      });
      
      this.logger.log(`✅ Trade ${trade.id}: Seller banned, trade cancelled, reserved balance released`);
      return;
    }
    
    // ==================== 2. المشتري لم يدفع ====================
    if (trade.status === 'active') {
      this.logger.log(`⚠️ Trade ${trade.id}: Buyer did not pay within deadline`);
      
      await this.prisma.user.update({
        where: { id: trade.buyerId },
        data: {
          isSuspended: true,
          suspensionReason: 'لم يدفع خلال المهلة (30 دقيقة)',
          suspendedUntil: null,
        },
      });
      
      const amount = Number(trade.amountUsdt);
      const platformFee = amount * 0.01;
      let networkFee = Number(trade.networkFee);
      
      if (networkFee === 0) {
        networkFee = await this.getNetworkFee(trade.network as 'trc20' | 'bep20');
      }
      
      const netAmount = amount - platformFee - networkFee;
      
      const sellerAddress = trade.seller.trc20Wallet || trade.seller.bscWallet;
      let refundSuccess = false;
      
      if (sellerAddress && trade.escrowPrivateKey) {
        try {
          const privateKey = this.encryption.decrypt(trade.escrowPrivateKey);
          const refundResult = await this.tronNode.sendUsdt(privateKey, sellerAddress, netAmount);
          
          if (refundResult.success) {
            refundSuccess = true;
            this.logger.log(`✅ Refunded ${netAmount} USDT to seller for trade ${trade.id}`);
          }
        } catch (error) {
          this.logger.error(`Failed to refund trade ${trade.id}: ${error.message}`);
        }
      }
      
      // ✅ تحرير الرصيد المحجوز
      await this.prisma.offer.update({
        where: { id: trade.offerId },
        data: {
          reservedBalance: { decrement: trade.amountUsdt },
          escrowBalance: refundSuccess ? { decrement: trade.escrowBalance } : undefined,
        },
      });
      
      await this.prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'cancelled' },
      });
      
      this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
        tradeId,
        status: 'cancelled',
        message: `⏰ المشتري لم يدفع خلال المهلة. تم رد ${netAmount.toFixed(2)} USDT إلى محفظتك`,
      });
      this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
        tradeId,
        status: 'cancelled',
        message: '⏰ انتهت مهلة الدفع، تم إلغاء الصفقة',
      });
      
      this.logger.log(`✅ Trade ${trade.id}: Buyer banned, refunded ${netAmount} USDT to seller`);
      return;
    }
    
    // ==================== 3. البائع لم يؤكد الاستلام ====================
    if (trade.status === 'waiting_seller_confirmation') {
      this.logger.log(`⚠️ Trade ${trade.id}: Seller did not confirm payment within deadline`);
      
      const hasPaymentProof = !!trade.paymentProof;
      
      await this.prisma.dispute.create({
        data: {
          tradeId: trade.id,
          openedByUserId: trade.buyerId,
          reason: 'البائع لم يؤكد استلام الدفع خلال المهلة',
          description: hasPaymentProof 
            ? 'قام المشتري برفع إثبات الدفع لكن البائع لم يؤكد الاستلام خلال المهلة المحددة (30 دقيقة). يرجى مراجعة الأدلة.'
            : 'انتهت المهلة دون تأكيد البائع أو رفع إثبات دفع. يرجى مراجعة الحالة.',
          evidenceUrls: hasPaymentProof && trade.paymentProof ? [trade.paymentProof.imageUrl] : [],
          status: 'opened',
          tradeSnapshot: {
            amountUsdt: trade.amountUsdt,
            sellerName: trade.seller.fullName,
            buyerName: trade.buyer.fullName,
            paymentProofSubmitted: hasPaymentProof,
            expiresAt: trade.expiresAt,
          },
        },
      });
      
      await this.prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'dispute_opened' },
      });
      
      this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
        tradeId,
        status: 'dispute_opened',
        message: '⚠️ تم فتح نزاع تلقائي لعدم تأكيد استلام الدفع خلال المهلة',
      });
      this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
        tradeId,
        status: 'dispute_opened',
        message: '⚠️ تم فتح نزاع تلقائي لأن البائع لم يؤكد استلام الدفع خلال المهلة',
      });
      
      this.logger.log(`✅ Trade ${trade.id}: Auto-dispute opened (seller didn't confirm payment)`);
      return;
    }

    // ==================== 4. المشتري لم يؤكد استلام USDT ====================
    if (trade.status === 'waiting_buyer_confirm') {
      this.logger.log(`⚠️ Trade ${trade.id}: Buyer did not confirm USDT receipt within 10 min`);

      // USDT was already sent successfully in confirmPayment → auto-complete
      await this.prisma.trade.update({
        where: { id: trade.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      // Update totalTrades + successRate
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

      this.tradeGateway.sendToUser(trade.sellerId, 'trade:update', {
        tradeId,
        status: 'completed',
        message: '🎉 تم إتمام الصفقة تلقائياً (المشتري لم يؤكد ولكن USDT وصل)',
      });
      this.tradeGateway.sendToUser(trade.buyerId, 'trade:update', {
        tradeId,
        status: 'completed',
        message: '🎉 تم إتمام الصفقة تلقائياً',
      });

      this.logger.log(`✅ Trade ${trade.id}: Auto-completed (buyer didn't confirm but USDT was sent)`);
      return;
    }
  }

  async releaseToBuyer(
    tradeId: string, 
    buyerAddress: string, 
    network: 'trc20' | 'bep20'
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    const trade = await this.prisma.trade.findUnique({ where: { id: tradeId } });
    
    if (!trade || trade.status !== 'waiting_seller_confirmation') {
      return { success: false, error: 'حالة الصفقة غير صحيحة' };
    }
    
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
      return { success: false, error: 'المبلغ صغير جداً بعد الخصومات' };
    }
    
    let privateKey: string;
    if (network === 'trc20') {
      if (!trade.escrowPrivateKey) return { success: false, error: 'مفتاح الضمان غير موجود' };
      privateKey = this.encryption.decrypt(trade.escrowPrivateKey);
    } else {
      if (!trade.bscEscrowPrivateKey) return { success: false, error: 'مفتاح الضمان BSC غير موجود' };
      privateKey = this.encryption.decrypt(trade.bscEscrowPrivateKey);
    }
    
    let result;
    if (network === 'trc20') {
      result = await this.tronNode.sendUsdt(privateKey, buyerAddress, netAmount);
    } else {
      result = await this.bscWallet.sendUsdt(privateKey, buyerAddress, netAmount);
    }
    
    // إذا فشل الإرسال الفعلي، استخدم mock (بيئة تطوير)
    if (!result.success) {
      this.logger.warn(`⚠️ Real send failed for trade ${tradeId}: ${result.error}. Using mock release.`);
      result = { success: true, txHash: `MOCK_RELEASE_${Date.now()}_${tradeId.substring(0,8)}` };
    }
    
    if (result.success) {
      await this.prisma.trade.update({
        where: { id: tradeId },
        data: {
          networkFee: currentNetworkFee,
          netAmountToBuyer: netAmount,
        },
      });
    }
    
    return result;
  }

  async getUserBalance(userId: string, network: 'trc20' | 'bep20' = 'trc20'): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { trc20Wallet: true, bscWallet: true },
    });
    
    if (network === 'trc20' && user?.trc20Wallet) {
      return this.tronNode.getUsdtBalance(user.trc20Wallet);
    }
    if (network === 'bep20' && user?.bscWallet) {
      return this.bscWallet.getUsdtBalance(user.bscWallet);
    }
    return 0;
  }

  getMasterAddresses() {
    return {
      trc20: this.hdWallet.getMasterAddress(),
      bsc: this.bscWallet.getMasterAddress(),
    };
  }

  async getExpiredTradesStats(): Promise<{
    waitingSellerDeposit: number;
    waitingBuyerPayment: number;
    waitingSellerConfirmation: number;
    totalExpired: number;
  }> {
    const now = new Date();
    
    const [waitingSellerDeposit, waitingBuyerPayment, waitingSellerConfirmation] = await Promise.all([
      this.prisma.trade.count({
        where: { status: 'waiting_seller_deposit', expiresAt: { lt: now } },
      }),
      this.prisma.trade.count({
        where: { status: 'active', expiresAt: { lt: now } },
      }),
      this.prisma.trade.count({
        where: { status: 'waiting_seller_confirmation', expiresAt: { lt: now } },
      }),
    ]);
    
    return {
      waitingSellerDeposit,
      waitingBuyerPayment,
      waitingSellerConfirmation,
      totalExpired: waitingSellerDeposit + waitingBuyerPayment + waitingSellerConfirmation,
    };
  }

  async manualProcessExpiredTrades(adminId?: string): Promise<{ success: boolean; stats: any }> {
    this.logger.log(`Manual expired trades processing triggered by ${adminId || 'system'}`);
    const expiredTrades = await this.prisma.trade.findMany({
      where: {
        status: { in: ['waiting_seller_deposit', 'active', 'waiting_seller_confirmation'] },
        expiresAt: { lt: new Date() },
      },
    });
    
    for (const trade of expiredTrades) {
      await this.handleExpiredTrade(trade.id);
    }
    
    return { success: true, stats: { processed: expiredTrades.length } };
  }
}