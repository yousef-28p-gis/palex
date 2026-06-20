// ===== FILE: src/modules/blockchain/bsc-wallet.service.ts =====

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import * as crypto from 'crypto';
import walletConfig from '../../config/wallet.config';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class BscWalletService implements OnModuleInit {
  private readonly logger = new Logger(BscWalletService.name);
  private provider: ethers.JsonRpcProvider;
  private masterAddress: string;
  private masterPrivateKey: string;
  private readonly USDT_CONTRACT = walletConfig.bscUsdtContractAddress;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeMasterWallet();
    // ✅ لا توجد تحديثات تلقائية هنا - التحديث فقط من SchedulerService
  }

  async initializeMasterWallet() {
    const nodeUrl = walletConfig.useTestnet ? walletConfig.bscTestnetUrl : walletConfig.bscProvider;
    this.provider = new ethers.JsonRpcProvider(nodeUrl);
    
    this.masterPrivateKey = walletConfig.masterBscPrivateKey;
    
    if (!this.masterPrivateKey || !this.masterPrivateKey.startsWith('0x')) {
      this.logger.error('❌ MASTER_BSC_PRIVATE_KEY غير صالح');
      throw new Error('Invalid BSC master private key');
    }
    
    const wallet = new ethers.Wallet(this.masterPrivateKey, this.provider);
    this.masterAddress = wallet.address;
    
    this.logger.log(`✅ BSC المحفظة الثانوية مهيأة: ${this.masterAddress}`);
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
      
      const amountWei = ethers.parseUnits(amount.toString(), 18);
      const tx = await contract.transfer(toAddress, amountWei, {
        gasLimit: 100000,
      });
      
      await tx.wait();
      
      this.logger.log(`✅ BSC USDT sent: ${amount} to ${toAddress}, tx: ${tx.hash}`);
      return { success: true, txHash: tx.hash };
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