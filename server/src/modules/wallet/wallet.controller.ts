// ===== FILE: src/modules/wallet/wallet.controller.ts =====

import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { HdWalletService } from '../blockchain/hd-wallet.service';
import { BscWalletService } from '../blockchain/bsc-wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private hdWallet: HdWalletService,
    private bscWallet: BscWalletService,
  ) {}

  @Get('master-addresses')
  @UseGuards(JwtAuthGuard)
  async getMasterAddresses() {
    return {
      trc20: this.hdWallet.getMasterAddress(),
      bsc: this.bscWallet.getMasterAddress(),
    };
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getUserBalance(@CurrentUser('id') userId: string) {
    const trc20Balance = await this.walletService.getUserBalance(userId, 'trc20');
    const bscBalance = await this.walletService.getUserBalance(userId, 'bep20');
    
    return {
      trc20: trc20Balance,
      bep20: bscBalance,
      total: trc20Balance + bscBalance,
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'finance_admin')
  async getExpiredStats() {
    return this.walletService.getExpiredTradesStats();
  }

  @Post('process-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'finance_admin')
  async processExpired(@CurrentUser('id') adminId: string) {
    return this.walletService.manualProcessExpiredTrades(adminId);
  }

  @Get('test-generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async testGenerate() {
    const testId = 'test-' + Date.now();
    const { address, privateKey } = this.hdWallet.generateEscrowAddress(testId);
    return {
      testId,
      address,
      addressLength: address.length,
      isValid: this.hdWallet.isValidAddress(address),
    };
  }
}