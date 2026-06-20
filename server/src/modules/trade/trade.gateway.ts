import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../shared/services/prisma.service';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
  namespace: 'trades',
})
export class TradeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TradeGateway.name);
  private userSockets: Map<string, string[]> = new Map();
  private pendingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private pendingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
      client.join(`user:${userId}`);

      // ✅ تحديث حالة المستخدم إلى نشط عند الاتصال
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          isActiveNow: true,
          lastSeenAt: new Date(),
        },
      });

      // إعلام المستخدمين الآخرين بأن هذا المستخدم أصبح نشطاً
      client.broadcast.emit('user:presence', {
        userId,
        isActive: true,
        timestamp: new Date(),
      });

      this.logger.log(`✅ User ${userId} connected to trades gateway (Total connections: ${sockets.length})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) {
          this.userSockets.delete(userId);
          this.logger.log(`User ${userId} disconnected (no more connections)`);
          
          // ✅ تحديث حالة المستخدم إلى غير نشط عند انقطاع الاتصال
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              isActiveNow: false,
              lastSeenAt: new Date(),
            },
          });
          
          // إعلام المستخدمين الآخرين بأن هذا المستخدم أصبح غير نشط
          client.broadcast.emit('user:presence', {
            userId,
            isActive: false,
            timestamp: new Date(),
          });
        } else {
          this.userSockets.set(userId, sockets);
          this.logger.log(`User ${userId} disconnected (${sockets.length} connections remain)`);
        }
        break;
      }
    }
  }

  // ✅ التعامل مع نبضات القلب (heartbeat)
  @SubscribeMessage('user:heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const userId = data.userId;
    
    // تحديث حالة المستخدم في قاعدة البيانات
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActiveNow: true,
        lastSeenAt: new Date(),
      },
    });
    
    // إعلام المستخدمين الآخرين بأن هذا المستخدم نشط
    client.broadcast.emit('user:presence', {
      userId,
      isActive: true,
      timestamp: new Date(),
    });
  }

  // ✅ 1. المشتري يطلب تأكيد وجود البائع (مرحلة ما قبل الصفقة)
  @SubscribeMessage('trade:request')
  async handleTradeRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offerId: string; amount: number; buyerId: string; buyerName: string },
  ) {
    this.logger.log(`📢 Trade request for offer ${data.offerId} from buyer ${data.buyerId}`);

    const offer = await this.prisma.offer.findUnique({
      where: { id: data.offerId },
      include: { seller: true },
    });

    if (!offer) {
      client.emit('trade:error', { message: 'العرض غير موجود' });
      return;
    }

    const sellerId = offer.sellerId;
    const pendingId = `pending_${Date.now()}_${data.offerId}`;

    const pendingMessage = {
      pendingId,
      offerId: data.offerId,
      amount: data.amount,
      buyerName: data.buyerName,
      buyerId: data.buyerId,
      message: `📢 لديك طلب شراء جديد!`,
      details: {
        amount: `${data.amount} USDT`,
        buyer: data.buyerName,
        timeLimit: '10 دقائق',
      },
      countdown: 600,
    };

    this.sendToUser(sellerId, 'trade:pending', pendingMessage);

    const interval = setInterval(() => {
      if (this.pendingTimeouts.has(pendingId)) {
        this.sendToUser(sellerId, 'trade:pending', {
          ...pendingMessage,
          reminder: true,
          message: `🔔 تذكير: لديك طلب شراء بمبلغ ${data.amount} USDT من ${data.buyerName}. يرجى تأكيد وجودك.`,
        });
      } else {
        clearInterval(interval);
        this.pendingIntervals.delete(pendingId);
      }
    }, 30000);

    this.pendingIntervals.set(pendingId, interval);

    const timeout = setTimeout(async () => {
      clearInterval(interval);
      this.pendingIntervals.delete(pendingId);
      this.pendingTimeouts.delete(pendingId);

      this.sendToUser(data.buyerId, 'trade:timeout', {
        message: '⏰ انتهت المهلة، لم يؤكد البائع وجوده.',
        details: {
          offerId: data.offerId,
          amount: data.amount,
          reason: 'لم يستجب البائع خلال 10 دقائق',
        },
        suggestion: 'يمكنك المحاولة مرة أخرى أو اختيار بائع آخر',
      });

      client.emit('trade:timeout', { 
        message: 'لم يؤكد البائع وجوده خلال 10 دقائق',
        offerId: data.offerId,
      });
    }, 10 * 60 * 1000);

    this.pendingTimeouts.set(pendingId, timeout);

    return { success: true, pendingId, message: 'جاري انتظار تأكيد البائع' };
  }

  // ✅ 2. البائع يؤكد وجوده (أنا موجود)
  @SubscribeMessage('trade:confirm')
  async handleTradeConfirm(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { pendingId: string; offerId: string; sellerId: string; buyerId: string },
  ) {
    this.logger.log(`✅ Seller ${data.sellerId} confirmed presence for pending ${data.pendingId}`);

    const timeout = this.pendingTimeouts.get(data.pendingId);
    if (timeout) {
      clearTimeout(timeout);
      this.pendingTimeouts.delete(data.pendingId);
    }

    const interval = this.pendingIntervals.get(data.pendingId);
    if (interval) {
      clearInterval(interval);
      this.pendingIntervals.delete(data.pendingId);
    }

    const offer = await this.prisma.offer.findUnique({
      where: { id: data.offerId },
      include: { seller: true },
    });

    if (offer) {
      this.sendToUser(data.buyerId, 'trade:ready', {
        message: '✅ البائع جاهز! يمكنك بدء الصفقة الآن.',
        sellerName: offer.seller.fullName,
        offerId: data.offerId,
        action: 'start_trade',
      });
    }

    return { success: true, message: 'تم تأكيد وجود البائع، يمكن للمشتري بدء الصفقة' };
  }

  // ✅ 3. إشعار بإيداع USDT
  sendDepositNotification(tradeId: string, sellerId: string, buyerId: string, amount: number, txHash: string) {
    const message = {
      tradeId,
      amount,
      txHash,
      message: `💰 تم إيداع ${amount} USDT في الضمان`,
      details: {
        amount: `${amount} USDT`,
        transactionHash: txHash,
        network: 'TRC20',
      },
      sound: 'deposit',
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(buyerId, 'trade:deposit', message);
    this.sendToUser(sellerId, 'trade:deposit', { ...message, message: `💰 تم إيداع ${amount} USDT في الضمان بنجاح` });

    this.logger.log(`💰 Deposit notification sent to buyer ${buyerId} for trade ${tradeId}`);
  }

  // ✅ 4. إشعار برفع إثبات الدفع
  sendPaymentProofNotification(tradeId: string, buyerId: string, sellerId: string) {
    const message = {
      tradeId,
      message: `📎 تم رفع إثبات الدفع، يرجى تأكيد استلام المبلغ`,
      details: {
        submittedBy: 'المشتري',
        action: 'confirm_payment',
      },
      sound: 'proof',
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(sellerId, 'trade:proof', message);
    this.sendToUser(buyerId, 'trade:proof', { ...message, message: `📎 تم رفع إثبات الدفع بنجاح، في انتظار تأكيد البائع` });

    this.logger.log(`📎 Payment proof notification sent to seller ${sellerId} for trade ${tradeId}`);
  }

  // ✅ 5. إشعار بتأكيد استلام الدفع
  sendConfirmationNotification(tradeId: string, sellerId: string, buyerId: string, txHash: string) {
    const message = {
      tradeId,
      txHash,
      message: `✅ تم تأكيد استلام المبلغ وتحرير USDT إلى محفظتك`,
      details: {
        transactionHash: txHash,
        status: 'completed',
      },
      sound: 'confirmed',
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(buyerId, 'trade:confirmed', message);
    this.sendToUser(sellerId, 'trade:confirmed', { ...message, message: `✅ تم تأكيد استلام المبلغ وتحرير USDT إلى المشتري` });

    this.logger.log(`✅ Confirmation notification sent to buyer ${buyerId} for trade ${tradeId}`);
  }

  // ✅ 6. إشعار بتحديث حالة الصفقة
  sendTradeUpdate(tradeId: string, sellerId: string, buyerId: string, status: string, message?: string) {
    const statusMessages: Record<string, string> = {
      'waiting_seller_deposit': 'في انتظار إيداع البائع USDT في الضمان',
      'active': 'تم إيداع USDT في الضمان، يرجى تحويل المبلغ البنكي',
      'waiting_seller_confirmation': 'تم رفع إثبات الدفع، في انتظار تأكيد البائع',
      'completed': '🎉 تم إتمام الصفقة بنجاح!',
      'cancelled': '❌ تم إلغاء الصفقة',
      'dispute_opened': '⚠️ تم فتح نزاع على الصفقة',
    };

    const updateData = {
      tradeId,
      status,
      message: message || statusMessages[status] || `تغيرت حالة الصفقة إلى: ${status}`,
      timestamp: new Date().toISOString(),
    };

    this.sendToUser(sellerId, 'trade:update', updateData);
    this.sendToUser(buyerId, 'trade:update', updateData);
    
    this.logger.log(`📡 Trade update sent for trade ${tradeId}: ${status}`);
  }

  // ✅ دالة مساعدة لإرسال رسالة لمستخدم معين
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (!sockets || sockets.length === 0) {
      this.logger.warn(`User ${userId} is not connected, cannot send ${event}`);
      return false;
    }
    
    this.server.to(`user:${userId}`).emit(event, data);
    this.logger.debug(`📤 Sent ${event} to user ${userId}`);
    return true;
  }

  // ✅ دالة للحصول على المستخدمين المتصلين
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  // ✅ دالة للحصول على عدد اتصالات مستخدم معين
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.length || 0;
  }
}