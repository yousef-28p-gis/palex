import { Injectable, Logger } from '@nestjs/common';
import TronWeb from 'tronweb';
import axios from 'axios';
import walletConfig from '../../config/wallet.config';

@Injectable()
export class TronNodeService {
  private readonly logger = new Logger(TronNodeService.name);
  private tronWeb: TronWeb;

  constructor() {
    const nodeUrl = walletConfig.useTestnet ? walletConfig.testnetUrl : walletConfig.tronProvider;
    
    this.tronWeb = new TronWeb({
      fullHost: nodeUrl,
    });
    
    this.logger.log(`✅ TronNodeService initialized with node: ${nodeUrl}`);
  }

  /**
   * التحقق من صحة عنوان Tron
   */
  isValidAddress(address: string): boolean {
    return TronWeb.isAddress(address);
  }

  /**
   * الحصول على رصيد USDT لعنوان معين
   */
  async getUsdtBalance(address: string): Promise<number> {
    try {
      if (!this.isValidAddress(address)) {
        this.logger.error(`Invalid address: ${address}`);
        return 0;
      }
      
      const contract = await this.tronWeb.contract().at(walletConfig.usdtContractAddress);
      const balance = await contract.balanceOf(address).call();
      return balance / 1e6;
    } catch (error) {
      this.logger.error(`Failed to get USDT balance: ${error.message}`);
      return 0;
    }
  }

  /**
   * التحقق من الإيداعات الواردة لعنوان الضمان
   */
  async checkDeposits(address: string, expectedAmount: number): Promise<{
    received: boolean;
    txHash?: string;
    amount?: number;
  }> {
    try {
      if (!this.isValidAddress(address)) {
        this.logger.error(`Invalid address for deposit check: ${address}`);
        return { received: false };
      }
      
      // استخدام TronWeb مباشرة بدلاً من axios
      const contract = await this.tronWeb.contract().at(walletConfig.usdtContractAddress);
      
      // الحصول على رصيد العنوان
      const balance = await contract.balanceOf(address).call();
      const balanceInUsdt = balance / 1e6;
      
      this.logger.debug(`Address ${address} balance: ${balanceInUsdt} USDT, expected: ${expectedAmount}`);
      
      if (balanceInUsdt >= expectedAmount) {
        // البحث عن آخر معاملة
        const transactions = await this.tronWeb.trx.getTransactionsRelated(address, 'incoming', 10);
        
        for (const tx of transactions) {
          if (tx.raw_data?.contract) {
            for (const contract of tx.raw_data.contract) {
              if (contract.type === 'TriggerSmartContract') {
                const data = contract.parameter.value.data;
                if (data && data.includes('a9059cbb')) { // transfer method
                  return {
                    received: true,
                    txHash: tx.txID,
                    amount: balanceInUsdt,
                  };
                }
              }
            }
          }
        }
        
        // إذا كان الرصيد كافياً ولكن لم نجد المعاملة
        return {
          received: true,
          amount: balanceInUsdt,
        };
      }
      
      return { received: false };
    } catch (error) {
      this.logger.error(`Failed to check deposits for ${address}: ${error.message}`);
      return { received: false };
    }
  }

  /**
   * إرسال USDT من عنوان ضمان إلى المشتري
   */
  async sendUsdt(fromPrivateKey: string, toAddress: string, amount: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.isValidAddress(toAddress)) {
        return { success: false, error: 'Invalid recipient address' };
      }
      
      this.tronWeb.setPrivateKey(fromPrivateKey);
      
      const contract = await this.tronWeb.contract().at(walletConfig.usdtContractAddress);
      const amountInSun = Math.floor(amount * 1e6);
      
      const transaction = await contract.transfer(toAddress, amountInSun).send();
      
      this.logger.log(`✅ USDT sent: ${amount} to ${toAddress}, tx: ${transaction}`);
      
      return { success: true, txHash: transaction };
    } catch (error) {
      this.logger.error(`Failed to send USDT: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * إرسال USDT من المحفظة الرئيسية
   */
  async sendFromMaster(toAddress: string, amount: number, masterPrivateKey: string): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    return this.sendUsdt(masterPrivateKey, toAddress, amount);
  }
}