import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { HdWalletService } from '../blockchain/hd-wallet.service';
import { BscWalletService } from '../blockchain/bsc-wallet.service';
import { TronNodeService } from '../../shared/services/tron-node.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { EncryptionService } from '../../shared/services/encryption.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [WalletController],
  providers: [
    WalletService,
    HdWalletService,
    BscWalletService,
    TronNodeService,
    PrismaService,
    EncryptionService,
  ],
  exports: [WalletService],
})
export class WalletModule {}