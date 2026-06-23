// ===== FILE: src/modules/review/review.service.ts =====

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async createReview(userId: string, dto: CreateReviewDto) {
    const trade = await this.prisma.trade.findUnique({
      where: { id: dto.tradeId },
      include: { buyer: true, seller: true },
    });

    if (!trade) throw new NotFoundException('الصفقة غير موجودة');
    if (trade.buyerId !== userId) throw new ForbiddenException('أنت لست مشتري هذه الصفقة');
    if (trade.status !== 'completed') throw new BadRequestException('لا يمكن تقييم صفقة غير مكتملة');

    // التحقق من عدم وجود تقييم مسبق من هذا المشتري لهذه الصفقة
    const existing = await this.prisma.review.findUnique({
      where: { tradeId_reviewerId: { tradeId: dto.tradeId, reviewerId: userId } },
    });

    if (existing) throw new BadRequestException('لقد قمت بتقييم هذه الصفقة مسبقاً');

    // إنشاء التقييم
    const review = await this.prisma.review.create({
      data: {
        tradeId: dto.tradeId,
        reviewerId: userId,
        revieweeId: trade.sellerId,
        rating: dto.rating,
        comment: dto.comment || '',
      },
      include: {
        reviewer: { select: { id: true, fullName: true } },
      },
    });

    // تحديث متوسط التقييم للبائع
    await this.updateSellerAverageRating(trade.sellerId);

    return { message: 'تم إرسال التقييم بنجاح', review };
  }

  async getReviewsForUser(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total, aggregated] = await Promise.all([
      this.prisma.review.findMany({
        where: { revieweeId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { id: true, fullName: true, profileImageUrl: true } },
          trade: { select: { amountUsdt: true, fiatCurrency: true, tradeReference: true } },
        },
      }),
      this.prisma.review.count({ where: { revieweeId: userId } }),
      this.prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      averageRating: aggregated._avg.rating ? Number(aggregated._avg.rating.toFixed(2)) : 0,
      totalReviews: aggregated._count.rating,
    };
  }

  async getTradeReview(tradeId: string) {
    const review = await this.prisma.review.findUnique({
      where: { tradeId },
      include: {
        reviewer: { select: { id: true, fullName: true } },
      },
    });
    return review;
  }

  private async updateSellerAverageRating(sellerId: string) {
    const aggregated = await this.prisma.review.aggregate({
      where: { revieweeId: sellerId },
      _avg: { rating: true },
    });

    const averageRating = aggregated._avg.rating ? Number(aggregated._avg.rating.toFixed(2)) : 0;

    await this.prisma.user.update({
      where: { id: sellerId },
      data: { averageRating },
    });
  }
}
