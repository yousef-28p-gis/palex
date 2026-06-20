import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TronService } from './tron.service';
import { BscService } from './bsc.service';
import { HdWalletService } from './hd-wallet.service';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    private tronService: TronService,
    private bscService: BscService,
    private hdWalletService: HdWalletService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createEscrowAddress(tradeId: string, network: string): Promise<string> {
    // استخدام HdWalletService لتوليد عنوان
    const { address } = this.hdWalletService.generateEscrowAddress(tradeId);
    return address;
  }

  async checkDeposit(
    tradeId: string,
    escrowAddress: string,
    network: string,
    expectedAmount: number,
  ): Promise<{ received: boolean; txHash?: string; amount?: number; confirmations?: number }> {
    return this.tronService.checkDeposit(escrowAddress, expectedAmount);
  }

  async releaseUSDT(
    escrowAddress: string,
    toAddress: string,
    amount: number,
    network?: string,
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    return this.tronService.releaseUSDT(escrowAddress, toAddress, amount);
  }

  async getNetworkFee(network: string): Promise<{ fee: number; cached: boolean; updatedAt?: Date }> {
    const fee = await this.tronService.getCurrentNetworkFee();
    return { fee, cached: true };
  }

  async getNetworkFeeWithDetails(network: string): Promise<{
    network: string;
    feeUSD: number;
    isCached: boolean;
    lastUpdated?: Date;
    nextUpdateIn?: number;
  }> {
    const fee = await this.tronService.getCurrentNetworkFee();
    return {
      network: network.toUpperCase(),
      feeUSD: fee,
      isCached: true,
    };
  }
}