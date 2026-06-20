import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { RefreshStrategy } from '../../common/strategies/refresh.strategy';
import { PrismaService } from '../../shared/services/prisma.service';
import { TokenService } from '../../shared/services/token.service';
import { MailService } from '../../shared/services/mail.service';
import { AuditService } from '../../shared/services/audit.service'; // ✅ تأكد من وجود هذا السطر

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshStrategy,
    PrismaService,
    TokenService,
    MailService,
    AuditService, // ✅ تأكد من إضافة AuditService هنا
  ],
  exports: [AuthService, TokenService],
})
export class AuthModule {}