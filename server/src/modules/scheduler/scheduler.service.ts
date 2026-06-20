// ===== FILE: src/modules/scheduler/scheduler.service.ts =====

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExchangeRateService } from '../exchange-rate/exchange-rate.service';
import { Trc20FeeService } from '../rates/trc20-fee.service';
import { Bep20FeeService } from '../rates/bep20-fee.service';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private exchangeRateService: ExchangeRateService,
    private trc20FeeService: Trc20FeeService,
    private bep20FeeService: Bep20FeeService,
  ) {}

  async updateAllRates() {
    this.logger.log('🔄 جاري تحديث جميع الأسعار...');
    
    const [exchange, trc20, bep20] = await Promise.all([
      this.exchangeRateService.fetchAndStore(),
      this.trc20FeeService.fetchAndStore(),
      this.bep20FeeService.fetchAndStore(),
    ]);

    this.logger.log(`✅ تم التحديث:`);
    this.logger.log(`   - سعر الشيكل: 1 USD = ${exchange.rate} ILS`);
    this.logger.log(`   - عمولة TRC20: ${trc20.fee} USDT`);
    this.logger.log(`   - عمولة BEP20: ${bep20.fee} USDT`);
  }

  // ✅ المصدر الوحيد للتحديث - كل 30 دقيقة
  @Cron('*/30 * * * *')
  async scheduledUpdate() {
    await this.updateAllRates();
  }

  // ✅ تحديث أولي عند بدء التشغيل
  async onModuleInit() {
    this.logger.log('🚀 تشغيل التحديث الأولي للأسعار...');
    await this.updateAllRates();
  }
}