import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly API_URL = 'https://api.frankfurter.app/latest?from=USD&to=ILS';

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
  ) {}

  async fetchAndStore(): Promise<{ rate: number; lastUpdated: Date }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.API_URL, { timeout: 10000 }),
      );
      
      const rate = response.data?.rates?.ILS;
      
      if (!rate || typeof rate !== 'number' || rate <= 0) {
        throw new Error('سعر غير صالح من API');
      }

      await this.prisma.exchangeRate.deleteMany();
      await this.prisma.exchangeRate.create({
        data: { usdToIls: rate, updatedAt: new Date() },
      });

      this.logger.log(`✅ تم تحديث سعر الصرف: 1 USD = ${rate} ILS`);
      
      return { rate: Number(rate.toFixed(4)), lastUpdated: new Date() };
    } catch (error) {
      this.logger.error(`فشل جلب سعر الصرف: ${error.message}`);
      const lastRate = await this.prisma.exchangeRate.findFirst();
      if (lastRate) {
        return { rate: Number(lastRate.usdToIls), lastUpdated: lastRate.updatedAt };
      }
      throw error;
    }
  }

  async getCurrentRate(): Promise<{ rate: number; lastUpdated: Date }> {
    const rate = await this.prisma.exchangeRate.findFirst();
    if (!rate) return this.fetchAndStore();
    return { rate: Number(rate.usdToIls), lastUpdated: rate.updatedAt };
  }

  async updateRate(usdToIls: number): Promise<{ success: boolean; rate: number }> {
    if (usdToIls <= 0) {
      return { success: false, rate: 0 };
    }
    
    await this.prisma.exchangeRate.deleteMany();
    await this.prisma.exchangeRate.create({
      data: { usdToIls, updatedAt: new Date() },
    });
    
    this.logger.log(`✅ تم تحديث سعر الصرف يدوياً: 1 USD = ${usdToIls} ILS`);
    
    return { success: true, rate: usdToIls };
  }
}