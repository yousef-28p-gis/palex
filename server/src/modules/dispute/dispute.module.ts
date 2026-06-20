// ===== FILE: src/modules/dispute/dispute.module.ts =====

import { Module } from '@nestjs/common';
import { DisputeController } from './dispute.controller';
import { DisputeService } from './dispute.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';
import { WalletModule } from '../wallet/wallet.module';
import { EncryptionService } from '../../shared/services/encryption.service';
import { TronNodeService } from '../../shared/services/tron-node.service';
import { BscWalletService } from '../blockchain/bsc-wallet.service';

@Module({
  imports: [WalletModule],
  controllers: [DisputeController],
  providers: [
    DisputeService,
    PrismaService,
    MailService,
    EncryptionService,
    TronNodeService,
    BscWalletService,
  ],
})
export class DisputeModule {}