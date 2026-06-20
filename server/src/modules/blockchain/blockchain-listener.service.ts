import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../shared/services/prisma.service';
import { BlockchainService } from './blockchain.service';

@Injectable()
export class BlockchainListenerService {
  private readonly logger = new Logger(BlockchainListenerService.name);

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async monitorDeposits() {
    const pendingTrades = await this.prisma.trade.findMany({
      where: { status: 'waiting_seller_deposit', escrowAddress: { not: null } },
    });

    for (const trade of pendingTrades) {
      const amountNum = Number(trade.amountUsdt);
      const deposit = await this.blockchainService.checkDeposit(
        trade.id,
        trade.escrowAddress!,
        trade.network,
        amountNum,
      );

      if (deposit.received && (deposit.confirmations ?? 0) >= 3) {
        await this.prisma.trade.update({
          where: { id: trade.id },
          data: { status: 'active', sellerDepositTxHash: deposit.txHash, escrowBalance: deposit.amount },
        });

        this.logger.log(`Deposit detected for trade ${trade.id}: ${deposit.amount} USDT`);
      }
    }
  }
}