// ===== FILE: src/modules/rates/bep20-fee.service.ts =====

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class Bep20FeeService {
  private readonly logger = new Logger(Bep20FeeService.name);
  private readonly rpcUrls = [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://rpc.ankr.com/bsc',
    'https://bsc.publicnode.com',
  ];

  constructor(private prisma: PrismaService) {}

  async fetchAndStore(): Promise<{ fee: number; lastUpdated: Date }> {
    // ✅ حفظ القيمة القديمة أولاً
    const oldFee = await this.prisma.networkFee.findUnique({
      where: { network: 'BEP20' },
    });

    for (const url of this.rpcUrls) {
      try {
        const res = await axios.post(
          url,
          { jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 },
          { timeout: 10000 }
        );

        if (res.data?.result) {
          const gasPriceWei = parseInt(res.data.result, 16);
          const gasPriceGwei = gasPriceWei / 1e9;
          
          // ✅ التحقق من أن السعر منطقي
          if (gasPriceGwei < 0.01 || gasPriceGwei > 100) {
            this.logger.warn(`Gas price غير منطقي: ${gasPriceGwei} Gwei، تخطي التحديث`);
            continue;
          }
          
          const estimatedGasUnits = 60000;
          const feeInBnb = (gasPriceWei * estimatedGasUnits) / 1e18;
          const bnbPrice = await this.getBnbPrice();
          let feeInUsd = feeInBnb * bnbPrice;
          feeInUsd = Math.min(Math.max(feeInUsd, 0.05), 2);

          await this.prisma.networkFee.upsert({
            where: { network: 'BEP20' },
            update: {
              feeAmount: feeInUsd,
              updatedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
            create: {
              network: 'BEP20',
              feeAmount: feeInUsd,
              energyFee: 0,
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
            },
          });

          this.logger.log(`✅ BEP20 fee: ${feeInUsd.toFixed(6)} USD (${gasPriceGwei.toFixed(2)} Gwei)`);
          return { fee: feeInUsd, lastUpdated: new Date() };
        }
      } catch (e) {
        this.logger.warn(`RPC ${url} failed: ${e.message}`);
      }
    }
    
    // ✅ إذا فشلت جميع المحاولات، احتفظ بالقيمة القديمة (لا نستخدم 0.5)
    if (oldFee && oldFee.feeAmount > 0) {
      this.logger.warn(`Using existing BEP20 fee: ${oldFee.feeAmount} USD`);
      return { fee: oldFee.feeAmount, lastUpdated: oldFee.updatedAt };
    }
    
    // ✅ قيمة افتراضية معقولة (ليست 0.5)
    this.logger.error('Using default BEP20 fee: 0.8 USD');
    return { fee: 0.8, lastUpdated: new Date() };
  }

  private async getBnbPrice(): Promise<number> {
    try {
      const res = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT', { timeout: 5000 });
      return parseFloat(res.data.price);
    } catch {
      return 600;
    }
  }

  async getCurrentFee(): Promise<{ fee: number; lastUpdated: Date }> {
    const fee = await this.prisma.networkFee.findUnique({ where: { network: 'BEP20' } });
    if (!fee) return this.fetchAndStore();
    return { fee: fee.feeAmount, lastUpdated: fee.updatedAt };
  }
}