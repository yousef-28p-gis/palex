// ===== FILE: src/modules/blockchain/bsc.service.ts =====

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import axios from 'axios';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class BscService implements OnModuleInit {
  private readonly logger = new Logger(BscService.name);
  private provider: ethers.JsonRpcProvider;
  private masterAddress: string;
  private masterPrivateKey: string;
  private readonly USDT_CONTRACT = '0x55d398326f99059fF775485246999027B3197955';
  private readonly rpcUrls: string[];

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.rpcUrls = [
      this.configService.get('BSC_PROVIDER') || 'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://rpc.ankr.com/bsc',
      'https://bsc.publicnode.com',
    ];
  }

  async onModuleInit() {
    await this.initializeMasterWallet();
    // ✅ لا توجد تحديثات تلقائية هنا - التحديث فقط من SchedulerService
  }

  private async initializeMasterWallet() {
    const masterPrivateKey = this.configService.get<string>('MASTER_BSC_PRIVATE_KEY');
    if (!masterPrivateKey) {
      throw new Error('MASTER_BSC_PRIVATE_KEY is not defined in environment variables');
    }
    if (!masterPrivateKey.startsWith('0x')) {
      throw new Error('MASTER_BSC_PRIVATE_KEY must start with 0x');
    }
    
    this.masterPrivateKey = masterPrivateKey;
    await this.connectToWorkingRpc();
    
    const wallet = new ethers.Wallet(this.masterPrivateKey, this.provider);
    this.masterAddress = wallet.address;
    
    this.logger.log(`✅ BSC المحفظة الثانوية مهيأة: ${this.masterAddress}`);
  }

  private async connectToWorkingRpc(): Promise<void> {
    for (const url of this.rpcUrls) {
      try {
        const testProvider = new ethers.JsonRpcProvider(url);
        await testProvider.getBlockNumber();
        this.provider = testProvider;
        this.logger.log(`✅ Connected to BSC RPC: ${url}`);
        return;
      } catch (error) {
        this.logger.warn(`Failed to connect to ${url}: ${error.message}`);
      }
    }
    throw new Error('All BSC RPC endpoints failed');
  }

  // ✅ دالة جلب رسوم الشبكة الحية (تُستدعى من SchedulerService فقط)
  async getCurrentNetworkFee(): Promise<number> {
    for (const url of this.rpcUrls) {
      try {
        const response = await axios.post(
          url,
          {
            jsonrpc: '2.0',
            method: 'eth_gasPrice',
            params: [],
            id: 1,
          },
          { timeout: 10000 }
        );

        if (response.data?.result) {
          const gasPriceWei = parseInt(response.data.result, 16);
          const gasPriceGwei = gasPriceWei / 1e9;
          
          if (gasPriceGwei < 0.01 || gasPriceGwei > 100) {
            this.logger.warn(`Gas price غير منطقي: ${gasPriceGwei} Gwei`);
            continue;
          }
          
          const estimatedGasUnits = 60000;
          const feeInBnb = (gasPriceWei * estimatedGasUnits) / 1e18;
          const bnbPrice = await this.getBnbPrice();
          let feeInUsd = feeInBnb * bnbPrice;
          feeInUsd = Math.min(Math.max(feeInUsd, 0.05), 2);
          
          this.logger.log(`📊 BSC: Gas=${gasPriceGwei.toFixed(2)} Gwei, BNB=$${bnbPrice}, Fee=$${feeInUsd.toFixed(6)}`);
          return feeInUsd;
        }
      } catch (error) {
        this.logger.warn(`RPC ${url} failed: ${error.message}`);
      }
    }
    
    this.logger.error('All BSC RPC endpoints failed');
    return 0.8; // قيمة افتراضية معقولة
  }

  private async getBnbPrice(): Promise<number> {
    try {
      const response = await axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT', {
        timeout: 5000,
      });
      return parseFloat(response.data.price);
    } catch (error) {
      this.logger.warn(`Failed to get BNB price: ${error.message}, using default $600`);
      return 600;
    }
  }

  generateEscrowAddress(tradeId: string): { address: string; privateKey: string } {
    const hash = crypto.createHash('sha256');
    hash.update(this.masterPrivateKey);
    hash.update(tradeId);
    hash.update(Date.now().toString());
    const privateKey = '0x' + hash.digest('hex').substring(0, 64);
    const wallet = new ethers.Wallet(privateKey);
    return { address: wallet.address, privateKey };
  }

  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  async getUsdtBalance(address: string): Promise<number> {
    try {
      if (!this.isValidAddress(address)) return 0;
      
      const contract = new ethers.Contract(
        this.USDT_CONTRACT,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );
      const balance = await contract.balanceOf(address);
      return Number(ethers.formatUnits(balance, 18));
    } catch (error) {
      this.logger.error(`Failed to get BSC USDT balance: ${error.message}`);
      return 0;
    }
  }

  async checkDeposits(address: string, expectedAmount: number): Promise<{
    received: boolean;
    txHash?: string;
    amount?: number;
  }> {
    try {
      const balance = await this.getUsdtBalance(address);
      
      if (balance >= expectedAmount) {
        this.logger.log(`✅ BSC deposit detected: ${balance} USDT at ${address}`);
        return { received: true, amount: balance };
      }
      return { received: false };
    } catch (error) {
      this.logger.error(`Failed to check BSC deposits: ${error.message}`);
      return { received: false };
    }
  }

  async sendUsdt(fromPrivateKey: string, toAddress: string, amount: number): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.isValidAddress(toAddress)) {
        return { success: false, error: 'Invalid recipient address' };
      }
      
      const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
      const contract = new ethers.Contract(
        this.USDT_CONTRACT,
        ['function transfer(address to, uint256 amount) public returns (bool)'],
        wallet
      );
      
      const amountWithDecimals = ethers.parseUnits(amount.toString(), 18);
      const gasPrice = await this.provider.getFeeData();
      const gasLimit = 100000;
      
      const tx = await contract.transfer(toAddress, amountWithDecimals, {
        gasLimit: gasLimit,
        gasPrice: gasPrice.gasPrice,
      });
      
      const receipt = await tx.wait();
      
      this.logger.log(`✅ BSC USDT sent: ${amount} to ${toAddress}, tx: ${receipt?.hash}`);
      return { success: true, txHash: receipt?.hash };
    } catch (error) {
      this.logger.error(`Failed to send BSC USDT: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  getMasterAddress(): string {
    return this.masterAddress;
  }

  getMasterPrivateKey(): string {
    return this.masterPrivateKey;
  }
}