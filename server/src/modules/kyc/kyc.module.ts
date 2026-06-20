import { Module } from '@nestjs/common';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { MailService } from '../../shared/services/mail.service';

@Module({
  controllers: [KycController],
  providers: [KycService, PrismaService, MailService],
})
export class KycModule {}