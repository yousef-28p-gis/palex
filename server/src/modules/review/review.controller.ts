// ===== FILE: src/modules/review/review.controller.ts =====

import { Controller, Post, Get, Param, Query, Body, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @SkipThrottle()
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(@CurrentUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewService.createReview(userId, dto);
  }

  @SkipThrottle()
  @Get('user/:userId')
  async getReviewsForUser(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewService.getReviewsForUser(userId, +page, +limit);
  }

  @SkipThrottle()
  @Get('trade/:tradeId')
  @UseGuards(JwtAuthGuard)
  async getTradeReview(@Param('tradeId') tradeId: string) {
    return this.reviewService.getTradeReview(tradeId);
  }
}
