import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter'; // ✅ أضف هذا السطر
import { BlockchainService } from './blockchain.service';
import { BlockchainController } from './blockchain.controller';
import { TronService } from './tron.service';
import { BscService } from './bsc.service';
import { HdWalletService } from './hd-wallet.service';
import { BlockchainListenerService } from './blockchain-listener.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { FeeCacheService } from '../../shared/services/fee-cache.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(), // ✅ أضف هذا السطر
    NotificationModule,
  ],
  controllers: [BlockchainController],
  providers: [
    BlockchainService,
    TronService,
    BscService,
    HdWalletService,
    BlockchainListenerService,
    PrismaService,
    FeeCacheService,
  ],
  exports: [BlockchainService, TronService, BscService, HdWalletService, FeeCacheService],
})
export class BlockchainModule {}