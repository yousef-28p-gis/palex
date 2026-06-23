// ===== FILE: src/app.module.ts =====

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { KycModule } from './modules/kyc/kyc.module';
import { OfferModule } from './modules/offer/offer.module';
import { TradeModule } from './modules/trade/trade.module';
import { DisputeModule } from './modules/dispute/dispute.module';
import { AdminModule } from './modules/admin/admin.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { NotificationModule } from './modules/notification/notification.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { RatesModule } from './modules/rates/rates.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { ReviewModule } from './modules/review/review.module';
import { StatsModule } from './modules/stats/stats.module';

import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaService } from './shared/services/prisma.service';
import { EncryptionService } from './shared/services/encryption.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    
    // ✅ هنا ضع ThrottlerModule مع الإعدادات
    ThrottlerModule.forRoot([
      {
        name: 'strict',     // للعمليات الحساسة (تسجيل الدخول، إنشاء صفقة)
        ttl: 60000,         // دقيقة واحدة
        limit: 10,          // 10 محاولات فقط
      },
      {
        name: 'normal',     // للعمليات العادية (جلب العروض، الصفقات)
        ttl: 60000,
        limit: 100,
      },
      {
        name: 'public',     // للمسارات العامة (الأسعار، الصفحة الرئيسية)
        ttl: 60000,
        limit: 200,
      },
    ]),
    
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    
    AuthModule,
    UserModule,
    KycModule,
    OfferModule,
    TradeModule,
    DisputeModule,
    AdminModule,
    BlockchainModule,
    NotificationModule,
    WalletModule,
    RatesModule,
    SchedulerModule,
    ReviewModule,
    StatsModule,
  ],
  providers: [
    PrismaService,
    EncryptionService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,  // ✅ يبقى مفعلاً
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}