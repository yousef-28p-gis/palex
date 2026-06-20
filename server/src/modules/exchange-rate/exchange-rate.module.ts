import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';  // ✅ إضافة هذا السطر
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateService } from './exchange-rate.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  imports: [HttpModule],  // ✅ إضافة HttpModule إلى imports
  controllers: [ExchangeRateController],
  providers: [ExchangeRateService, PrismaService],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}