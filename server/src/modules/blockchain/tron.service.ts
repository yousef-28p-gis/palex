import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import TronWeb from 'tronweb';
import walletConfig from '../../config/wallet.config';

@Injectable()
export class TronService implements OnModuleInit {
  private readonly logger = new Logger(TronService.name);
  private tronWeb: TronWeb;
  private readonly tronProvider: string;
  private readonly apiKey: string;
  private readonly USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
  
  // ✅ حدود الأمان للقيم
  private readonly MIN_ENERGY_CONSUMED = 30000;
  private readonly MAX_ENERGY_CONSUMED = 100000;
  private readonly MIN_ENERGY_PRICE = 10;
  private readonly MAX_ENERGY_PRICE = 500;
  private readonly DEFAULT_ENERGY_CONSUMED = 65000;
  private readonly DEFAULT_ENERGY_PRICE = 100;

  constructor(private configService: ConfigService) {
    this.tronProvider = this.configService.get('TRON_PROVIDER') || 'https://api.trongrid.io';
    this.apiKey = this.configService.get('TRON_API_KEY') || '';
  }

  async onModuleInit() {
    this.tronWeb = new TronWeb({
      fullHost: this.tronProvider,
      headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
    });
    this.logger.log('✅ TronService initialized');
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
              params: { limit: 5, only_token: true, contract_address: this.USDT_CONTRACT },
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

  // ✅ دالة جلب رسوم الشبكة الحية (مع حدود أمان)
  async getCurrentNetworkFee(): Promise<number> {
    try {
      // جلب جميع القيم مع حدود الأمان
      let energyConsumed = await this.getActualEnergyConsumed();
      let energyPrice = await this.getActualEnergyPrice();
      const trxPrice = await this.getTrxPrice();
      
      // تأكيد الحدود مرة أخرى قبل الحساب
      energyConsumed = Math.min(Math.max(energyConsumed, this.MIN_ENERGY_CONSUMED), this.MAX_ENERGY_CONSUMED);
      energyPrice = Math.min(Math.max(energyPrice, this.MIN_ENERGY_PRICE), this.MAX_ENERGY_PRICE);
      
      // الحساب
      const feeInTrx = (energyPrice * energyConsumed) / 1e6;
      let feeInUsd = feeInTrx * trxPrice;
      
      // الحد الأقصى للعمولة 3 دولار، الحد الأدنى 0.5 دولار
      feeInUsd = Math.min(Math.max(feeInUsd, 0.5), 3);
      
      this.logger.log(`📊 TRC20 fee calculation:`);
      this.logger.log(`   - Energy Consumed: ${energyConsumed}`);
      this.logger.log(`   - Energy Price: ${energyPrice} SUN`);
      this.logger.log(`   - Fee in TRX: ${feeInTrx.toFixed(4)} TRX`);
      this.logger.log(`   - TRX Price: $${trxPrice.toFixed(4)}`);
      this.logger.log(`   - Fee in USD: $${feeInUsd.toFixed(4)}`);
      
      return feeInUsd;
    } catch (error) {
      this.logger.error(`Failed to get TRC20 fee: ${error.message}`);
      return 1.5; // قيمة افتراضية آمنة
    }
  }

  async checkDeposit(address: string, expectedAmount: number): Promise<{
    received: boolean;
    txHash?: string;
    amount?: number;
    confirmations?: number;
  }> {
    try {
      const url = `${this.tronProvider}/v1/accounts/${address}/transactions/trc20`;
      const response = await axios.get(url, {
        headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
        timeout: 10000,
      });

      const transactions = response.data?.data || [];

      for (const tx of transactions) {
        if (
          tx.token_info?.symbol === 'USDT' &&
          tx.to === address &&
          parseInt(tx.value) === expectedAmount * 1e6
        ) {
          this.logger.log(`✅ Deposit detected: ${expectedAmount} USDT to ${address}`);
          return {
            received: true,
            txHash: tx.transaction_id,
            amount: parseInt(tx.value) / 1e6,
            confirmations: 3,
          };
        }
      }

      return { received: false };
    } catch (error) {
      this.logger.error(`Failed to check deposit: ${error.message}`);
      return { received: false };
    }
  }

  async releaseUSDT(
    fromPrivateKey: string,
    toAddress: string,
    amount: number,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      this.tronWeb.setPrivateKey(fromPrivateKey);
      const contract = await this.tronWeb.contract().at(this.USDT_CONTRACT);
      const amountInSun = Math.floor(amount * 1e6);
      const transaction = await contract.transfer(toAddress, amountInSun).send();
      
      this.logger.log(`✅ USDT released: ${amount} to ${toAddress}, tx: ${transaction}`);
      return { success: true, txHash: transaction };
    } catch (error) {
      this.logger.error(`Failed to release USDT: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  isValidAddress(address: string): boolean {
    return TronWeb.isAddress(address);
  }

  async getBalance(address: string): Promise<number> {
    try {
      const url = `${this.tronProvider}/v1/accounts/${address}`;
      const response = await axios.get(url, {
        headers: this.apiKey ? { 'TRON-PRO-API-KEY': this.apiKey } : {},
        timeout: 10000,
      });

      const trc20Tokens = response.data?.data?.[0]?.trc20 || [];
      for (const token of trc20Tokens) {
        if (token[this.USDT_CONTRACT]) {
          return parseInt(token[this.USDT_CONTRACT]) / 1e6;
        }
      }
      return 0;
    } catch (error) {
      this.logger.error(`Failed to get balance: ${error.message}`);
      return 0;
    }
  }
}