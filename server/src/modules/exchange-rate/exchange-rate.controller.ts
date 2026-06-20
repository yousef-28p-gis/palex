// ===== FILE: src/modules/exchange-rate/exchange-rate.controller.ts =====

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private exchangeRateService: ExchangeRateService) {}

  @Get()
  async getCurrentRate() {
    return this.exchangeRateService.getCurrentRate();
  }

  @Post('update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'finance_admin')
  async updateRate(@Body('usdToIls') usdToIls: number) {
    return this.exchangeRateService.updateRate(usdToIls);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'finance_admin')
  async refreshRate() {
    const result = await this.exchangeRateService.fetchAndStore();
    return { success: true, message: 'تم تحديث سعر الصرف', rate: result.rate };
  }
}