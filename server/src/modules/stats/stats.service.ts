import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getTopSellers() {
    // ✅ أفضل 3 بائعين حسب عدد الصفقات ومتوسط التقييم
    const sellers = await this.prisma.user.findMany({
      where: {
        role: 'user',
        totalTrades: { gt: 0 },
        averageRating: { gt: 0 },
        isSuspended: false,
      },
      orderBy: [
        { totalTrades: 'desc' },
        { averageRating: 'desc' },
      ],
      take: 3,
      select: {
        id: true,
        fullName: true,
        averageRating: true,
        totalTrades: true,
        successRate: true,
      },
    });

    return {
      success: true,
      data: sellers.map(s => ({
        id: s.id,
        name: s.fullName,
        averageRating: Number(s.averageRating),
        totalTrades: s.totalTrades,
        successRate: Number(s.successRate),
      })),
    };
  }

  async getPublicStats() {
    // ✅ استعلام واحد يجمع كل الإحصائيات
    const [
      tradersResult,
      volumeResult,
      timeResult,
    ] = await Promise.all([
      // 1. عدد المتداولين النشطين (الذين لهم صفقات مكتملة)
      this.prisma.user.count({
        where: {
          OR: [
            { tradesAsSeller: { some: { status: 'completed' } } },
            { tradesAsBuyer: { some: { status: 'completed' } } },
          ],
        },
      }),

      // 2. إجمالي حجم التداول (USDT في الصفقات المكتملة)
      this.prisma.trade.aggregate({
        where: { status: 'completed' },
        _sum: { amountUsdt: true },
      }),

      // 3. متوسط وقت إتمام الصفقة (بالدقائق)
      this.prisma.trade.findMany({
        where: {
          status: 'completed',
          completedAt: { not: null },
        },
        select: {
          createdAt: true,
          completedAt: true,
        },
      }),

      // 4. (محذوف — التقييمات خاصة بالبائعين وليست للمنصة)
    ]);

    // ✅ حساب متوسط وقت الإتمام
    let avgMinutes = 0;
    if (timeResult.length > 0) {
      const totalMinutes = timeResult.reduce((sum, trade) => {
        const diff = trade.completedAt!.getTime() - trade.createdAt.getTime();
        return sum + diff;
      }, 0);
      avgMinutes = Math.round(totalMinutes / timeResult.length / 60000);
    }

    // ✅ تنسيق الحجم
    const volume = Number(volumeResult._sum.amountUsdt) || 0;
    let volumeFormatted: string;
    if (volume >= 1000000) {
      volumeFormatted = `${(volume / 1000000).toFixed(0)}M+`;
    } else if (volume >= 1000) {
      volumeFormatted = `${(volume / 1000).toFixed(0)}K+`;
    } else {
      volumeFormatted = `${volume.toFixed(0)}+`;
    }

    // ✅ تنسيق وقت الإتمام
    let timeFormatted: string;
    if (avgMinutes < 1) {
      timeFormatted = '< 1 دقيقة';
    } else if (avgMinutes < 60) {
      timeFormatted = `~ ${avgMinutes} دقيقة`;
    } else {
      const hours = Math.floor(avgMinutes / 60);
      timeFormatted = `~ ${hours} ساعة`;
    }

    return {
      success: true,
      data: {
        totalTraders: tradersResult,
        totalTradersFormatted: tradersResult >= 1000
          ? `${(tradersResult / 1000).toFixed(1)}K+`
          : `${tradersResult}+`,
        totalVolume: volume,
        totalVolumeFormatted: volumeFormatted,
        volumeUnit: volume >= 1000000 ? 'M' : volume >= 1000 ? 'K' : '',
        avgCompletionTimeMinutes: avgMinutes,
        avgCompletionTimeFormatted: timeFormatted,

      },
    };
  }
}
