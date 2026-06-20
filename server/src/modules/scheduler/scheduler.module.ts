// ===== FILE: src/modules/scheduler/scheduler.module.ts =====

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { RatesModule } from '../rates/rates.module';

@Module({
  imports: [ScheduleModule.forRoot(), RatesModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}