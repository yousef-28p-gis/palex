import { Module } from '@nestjs/common';
import { OfferController } from './offer.controller';
import { OfferService } from './offer.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [OfferController],
  providers: [OfferService, PrismaService],
  exports: [OfferService],
})
export class OfferModule {}