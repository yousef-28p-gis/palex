// ===== FILE: src/modules/rates/rates.controller.ts =====

import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler'; // ✅ من throttler وليس من common
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { Trc20FeeService } from './trc20-fee.service';
import { Bep20FeeService } from './bep20-fee.service';

@Controller('rates')
export class RatesController {
  constructor(
    private exchangeRateService: ExchangeRateService,
    private trc20FeeService: Trc20FeeService,
    private bep20FeeService: Bep20FeeService,
  ) {}

  @SkipThrottle()
  @Get('all')
  async getAllRates() {
    const [exchange, trc20, bep20] = await Promise.all([
      this.exchangeRateService.getCurrentRate(),
      this.trc20FeeService.getCurrentFee(),
      this.bep20FeeService.getCurrentFee(),
    ]);

    return {
      success: true,
      data: {
        exchange: {
          usdToIls: exchange.rate,
          lastUpdated: exchange.lastUpdated,
        },
        fees: {
          trc20: {
            fee: trc20.fee,
            lastUpdated: trc20.lastUpdated,
          },
          bep20: {
            fee: bep20.fee,
            lastUpdated: bep20.lastUpdated,
          },
        },
      },
    };
  }
}