// ملف جديد: src/shared/services/fee-cache.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export interface CachedFee {
  feeAmount: number;  // بالدولار
  energyFee: number;  // بسعر SUN
  updatedAt: Date;
}

@Injectable()
export class FeeCacheService {
  private readonly logger = new Logger(FeeCacheService.name);
  private feeCache = new Map<string, CachedFee>();

  constructor(private prisma: PrismaService) {
    this.loadFeesToCache();
  }

  async loadFeesToCache() {
    try {
      const fees = await this.prisma.networkFee.findMany();
      fees.forEach(fee => {
        this.feeCache.set(fee.network, {
          feeAmount: fee.feeAmount,
          energyFee: fee.energyFee,
          updatedAt: fee.updatedAt,
        });
      });
      this.logger.log(`✅ Loaded ${fees.length} network fees to cache`);
    } catch (error) {
      this.logger.error(`Failed to load fees to cache: ${error.message}`);
    }
  }

  getCurrentFee(network: string): CachedFee | null {
    const cached = this.feeCache.get(network);
    if (cached) {
      this.logger.debug(`Cache hit for ${network}: $${cached.feeAmount}`);
      return cached;
    }
    this.logger.warn(`Cache miss for ${network}`);
    return null;
  }

  async updateFee(network: string, feeAmount: number, energyFee: number) {
    try {
      const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // دقيقتين من الآن
      
      const updated = await this.prisma.networkFee.upsert({
        where: { network },
        update: { 
          feeAmount, 
          energyFee, 
          expiresAt,
          updatedAt: new Date(),
        },
        create: { 
          network, 
          feeAmount, 
          energyFee, 
          expiresAt,
        },
      });

      // تحديث الكاش مباشرة
      this.feeCache.set(network, {
        feeAmount: updated.feeAmount,
        energyFee: updated.energyFee,
        updatedAt: updated.updatedAt,
      });

      this.logger.log(`✅ Fee updated for ${network}: $${feeAmount} (Energy: ${energyFee} SUN) - Expires at ${expiresAt}`);
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update fee: ${error.message}`);
      throw error;
    }
  }

  async getFeeWithFallback(network: string, fallbackFunction: () => Promise<number>): Promise<CachedFee> {
    const cached = this.getCurrentFee(network);
    
    if (cached && cached.updatedAt > new Date(Date.now() - 2 * 60 * 1000)) {
      // الكاش لا يزال صالحاً (أقل من دقيقتين)
      return cached;
    }

    // الكاش قديم أو غير موجود، جلب من المصدر
    this.logger.warn(`Cache expired for ${network}, fetching fresh data...`);
    const freshFee = await fallbackFunction();
    const freshEnergy = await this.getFreshEnergyFee();
    
    await this.updateFee(network, freshFee, freshEnergy);
    return this.getCurrentFee(network)!;
  }

  private async getFreshEnergyFee(): Promise<number> {
    // هذه دالة مساعدة، يمكنك تعديلها حسب الحاجة
    return 100; // قيمة افتراضية
  }
}