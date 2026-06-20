import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class Trc20FeeService {
  private readonly logger = new Logger(Trc20FeeService.name);
  private readonly tronProvider: string;
  private readonly apiKey: string;
  
  // ✅ حدود الأمان للقيم
  private readonly MIN_ENERGY_CONSUMED = 30000;
  private readonly MAX_ENERGY_CONSUMED = 100000;
  private readonly MIN_ENERGY_PRICE = 10;
  private readonly MAX_ENERGY_PRICE = 500;
  private readonly DEFAULT_ENERGY_CONSUMED = 65000;
  private readonly DEFAULT_ENERGY_PRICE = 100;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.tronProvider = this.configService.get('TRON_PROVIDER') || 'https://api.trongrid.io';
    this.apiKey = this.configService.get('TRON_API_KEY') || '';
  }

  // ✅ جلب استهلاك الطاقة من معاملة حقيقية مع حدود أمان
  private async getActualEnergyConsumed(): Promise<number> {
    try {
      const addresses = [
        'TThYBLh8AYPZzivv8v2nP1Y95i1VnGZV7F',
        'TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj',
      ];
      
      for (const address of addresses) {
        try {
          const response = await axios.get(
            `${this.tronProvider}/v1/accounts/${address}/transactions/trc20`,
            {
              params: { limit: 5, only_token: true, contract_address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' },
              headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
              timeout: 8000,
            }
          );
          
          const transactions = response.data?.data || [];
          let totalEnergy = 0;
          let count = 0;
          
          for (const tx of transactions) {
            let energy = 0;
            if (tx.energy_usage) energy = parseInt(tx.energy_usage);
            else if (tx.energy_usage_total) energy = parseInt(tx.energy_usage_total);
            
            if (energy > 0 && energy >= this.MIN_ENERGY_CONSUMED && energy <= this.MAX_ENERGY_CONSUMED) {
              totalEnergy += energy;
              count++;
            }
          }
          
          if (count > 0) {
            const avgEnergy = Math.round(totalEnergy / count);
            this.logger.debug(`Average energy consumed: ${avgEnergy} from ${count} transactions`);
            return avgEnergy;
          }
        } catch (e) {
          continue;
        }
      }
      
      this.logger.warn(`Could not determine energy consumed, using default: ${this.DEFAULT_ENERGY_CONSUMED}`);
      return this.DEFAULT_ENERGY_CONSUMED;
    } catch (error) {
      this.logger.warn(`Failed to get energy consumed: ${error.message}`);
      return this.DEFAULT_ENERGY_CONSUMED;
    }
  }

  // ✅ جلب سعر الطاقة من الشبكة مع حدود أمان
  private async getActualEnergyPrice(): Promise<number> {
    try {
      const response = await axios.post(
        `${this.tronProvider}/wallet/getchainparameters`,
        {},
        {
          headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
          timeout: 10000,
        }
      );
      
      const chainParams = response.data?.chainParameter || [];
      const energyParam = chainParams.find((p: any) => p.key === 'getEnergyFee');
      
      if (energyParam?.value) {
        let price = parseInt(energyParam.value);
        
        if (price >= this.MIN_ENERGY_PRICE && price <= this.MAX_ENERGY_PRICE) {
          this.logger.debug(`Energy price from network: ${price} SUN`);
          return price;
        } else {
          this.logger.warn(`Energy price out of range: ${price}, using default`);
        }
      }
      
      return this.DEFAULT_ENERGY_PRICE;
    } catch (error) {
      this.logger.warn(`Failed to get energy price: ${error.message}`);
      return this.DEFAULT_ENERGY_PRICE;
    }
  }

  // ✅ جلب سعر TRX من Binance
  private async getTrxPrice(): Promise<number> {
    try {
      const response = await axios.get(
        'https://api.binance.com/api/v3/ticker/price?symbol=TRXUSDT',
        { timeout: 5000 }
      );
      const price = parseFloat(response.data.price);
      if (price > 0 && price < 1) {
        return price;
      }
      return 0.11;
    } catch (error) {
      this.logger.warn(`Failed to get TRX price: ${error.message}`);
      return 0.11;
    }
  }

  async fetchAndStore(): Promise<{ fee: number; energyFee: number; lastUpdated: Date }> {
    try {
      // ✅ جلب جميع القيم مع حدود الأمان
      let energyConsumed = await this.getActualEnergyConsumed();
      let energyPrice = await this.getActualEnergyPrice();
      const trxPrice = await this.getTrxPrice();
      
      // ✅ تأكيد الحدود مرة أخرى قبل الحساب
      energyConsumed = Math.min(Math.max(energyConsumed, this.MIN_ENERGY_CONSUMED), this.MAX_ENERGY_CONSUMED);
      energyPrice = Math.min(Math.max(energyPrice, this.MIN_ENERGY_PRICE), this.MAX_ENERGY_PRICE);
      
      // ✅ الحساب
      const feeInTrx = (energyPrice * energyConsumed) / 1e6;
      let feeInUsd = feeInTrx * trxPrice;
      
      // ✅ الحد الأقصى للعمولة 3 دولار، الحد الأدنى 0.5 دولار
      feeInUsd = Math.min(Math.max(feeInUsd, 0.5), 3);
      
      this.logger.log(`📊 TRC20 fee calculation:`);
      this.logger.log(`   - Energy Consumed: ${energyConsumed}`);
      this.logger.log(`   - Energy Price: ${energyPrice} SUN`);
      this.logger.log(`   - Fee in TRX: ${feeInTrx.toFixed(4)} TRX`);
      this.logger.log(`   - TRX Price: $${trxPrice.toFixed(4)}`);
      this.logger.log(`   - Fee in USD: $${feeInUsd.toFixed(4)}`);
      
      // ✅ تخزين في قاعدة البيانات
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 دقيقة
      
      await this.prisma.networkFee.upsert({
        where: { network: 'TRC20' },
        update: {
          feeAmount: feeInUsd,
          energyFee: energyPrice,
          updatedAt: new Date(),
          expiresAt: expiresAt,
        },
        create: {
          network: 'TRC20',
          feeAmount: feeInUsd,
          energyFee: energyPrice,
          expiresAt: expiresAt,
        },
      });

      return {
        fee: feeInUsd,
        energyFee: energyPrice,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch TRC20 fee: ${error.message}`);
      
      // ✅ استخدام آخر قيمة مخزنة إذا فشلت
      const lastFee = await this.prisma.networkFee.findUnique({
        where: { network: 'TRC20' },
      });
      
      if (lastFee && lastFee.feeAmount > 0 && lastFee.feeAmount < 10) {
        this.logger.warn(`Using cached TRC20 fee: ${lastFee.feeAmount} USD`);
        return {
          fee: lastFee.feeAmount,
          energyFee: lastFee.energyFee,
          lastUpdated: lastFee.updatedAt,
        };
      }
      
      // ✅ قيمة آمنة نهائية
      this.logger.warn('Using safe default TRC20 fee: 2.1 USD');
      return { fee: 2.1, energyFee: 100, lastUpdated: new Date() };
    }
  }

  async getCurrentFee(): Promise<{ fee: number; energyFee: number; lastUpdated: Date }> {
    const fee = await this.prisma.networkFee.findUnique({
      where: { network: 'TRC20' },
    });
    
    if (!fee) {
      return this.fetchAndStore();
    }
    
    // ✅ التحقق من انتهاء الصلاحية
    if (fee.expiresAt && new Date(fee.expiresAt) < new Date()) {
      this.logger.warn('TRC20 fee cache expired, fetching fresh data...');
      return this.fetchAndStore();
    }
    
    return {
      fee: fee.feeAmount,
      energyFee: fee.energyFee,
      lastUpdated: fee.updatedAt,
    };
  }
}