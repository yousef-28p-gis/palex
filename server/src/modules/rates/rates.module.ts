// ===== FILE: src/modules/rates/rates.module.ts =====

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RatesController } from './rates.controller';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { Trc20FeeService } from './trc20-fee.service';
import { Bep20FeeService } from './bep20-fee.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  imports: [HttpModule],
  controllers: [RatesController],
  providers: [
    ExchangeRateService,
    Trc20FeeService,
    Bep20FeeService,
    PrismaService,
  ],
  exports: [ExchangeRateService, Trc20FeeService, Bep20FeeService],
})
export class RatesModule {}