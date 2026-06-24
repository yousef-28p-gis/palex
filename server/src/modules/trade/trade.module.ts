// ===== FILE: src/modules/trade/trade.module.ts =====
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TradeController } from './trade.controller';
import { TradeService } from './trade.service';
import { TradeGateway } from './trade.gateway';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';
import { WalletModule } from '../wallet/wallet.module'; // ✅ استورد WalletModule
import { HdWalletService } from '../blockchain/hd-wallet.service'; // ✅ أضف هذا
import { EncryptionService } from '../../shared/services/encryption.service'; // ✅ أضف هذا
import { TronNodeService } from '../../shared/services/tron-node.service'; // ✅ أضف هذا

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
    WalletModule, // ✅ استيراد WalletModule بالكامل
    forwardRef(() => WalletModule), // ✅ forwardRef لتجنب circular dependency
  ],
  controllers: [TradeController],
  providers: [
    TradeService,
    TradeGateway,
    PrismaService,
    MailService,
    HdWalletService,      // ✅ أضف هذا
    EncryptionService,    // ✅ أضف هذا
    TronNodeService,      // ✅ أضف هذا
  ],
  exports: [TradeService, TradeGateway],
})
export class TradeModule {}