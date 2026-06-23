import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private statsService: StatsService) {}

  @SkipThrottle({ strict: true, normal: true, public: false })
  @Get('public')
  async getPublicStats() {
    return this.statsService.getPublicStats();
  }
}
