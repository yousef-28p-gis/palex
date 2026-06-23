// ===== FILE: src/modules/review/review.module.ts =====

import { Module } from '@nestjs/common';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  controllers: [ReviewController],
  providers: [ReviewService, PrismaService],
  exports: [ReviewService],
})
export class ReviewModule {}
