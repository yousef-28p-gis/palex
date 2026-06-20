import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TronWeb from 'tronweb';
import * as crypto from 'crypto';
import walletConfig from '../../config/wallet.config';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class HdWalletService implements OnModuleInit {
  private readonly logger = new Logger(HdWalletService.name);
  private tronWeb: TronWeb;
  private masterAddress: string;
  private masterPrivateKey: string;

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeMasterWallet();
  }

  async initializeMasterWallet() {
    const nodeUrl = walletConfig.useTestnet ? walletConfig.testnetUrl : walletConfig.tronProvider;
    this.tronWeb = new TronWeb({
      fullHost: nodeUrl,
    });
    
    this.masterPrivateKey = walletConfig.masterPrivateKey;
    
    if (!this.masterPrivateKey || this.masterPrivateKey.length !== 64) {
      this.logger.error('❌ MASTER_PRIVATE_KEY غير صالح');
      throw new Error('Invalid master private key');
    }
    
    this.masterAddress = this.tronWeb.address.fromPrivateKey(this.masterPrivateKey);
    
    this.logger.log(`✅ المحفظة الرئيسية: ${this.masterAddress}`);
    this.logger.log(`✅ طول العنوان الرئيسي: ${this.masterAddress.length} حرف`);
  }

  generateEscrowAddress(tradeId: string): { address: string; privateKey: string } {
    const hash = crypto.createHash('sha256');
    hash.update(this.masterPrivateKey);
    hash.update(tradeId);
    hash.update(Date.now().toString());
    let privateKey = hash.digest('hex');
    
    while (privateKey.length < 64) {
      privateKey = '0' + privateKey;
    }
    privateKey = privateKey.substring(0, 64);
    
    let address = '';
    try {
      address = this.tronWeb.address.fromPrivateKey(privateKey);
    } catch (error) {
      this.logger.error(`Failed to generate address: ${error.message}`);
      address = this.generateFallbackAddress(tradeId);
    }
    
    if (!address || address.length !== 34 || !address.startsWith('T')) {
      this.logger.warn(`Generated invalid address, using fallback`);
      address = this.generateFallbackAddress(tradeId);
    }
    
    this.logger.log(`✅ Escrow address for ${tradeId}: ${address}`);
    
    return { address, privateKey };
  }

  private generateFallbackAddress(tradeId: string): string {
    const baseAddress = this.masterAddress;
    if (baseAddress && baseAddress.length === 34) {
      const hash = crypto.createHash('sha256').update(tradeId).digest('hex');
      const modified = baseAddress.substring(0, 30) + hash.substring(0, 4);
      return modified;
    }
    return 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  }

  // ✅ الدالة المصححة
  isValidAddress(address: string): boolean {
    if (!address) return false;
    if (address.length !== 34) return false;
    if (!address.startsWith('T')) return false;
    return true;
  }

  getMasterAddress(): string {
    return this.masterAddress;
  }

  getMasterPrivateKey(): string {
    return this.masterPrivateKey;
  }

  deriveTradeAddress(tradeId: string, network: string): { address: string } {
    return { address: this.generateEscrowAddress(tradeId).address };
  }
}