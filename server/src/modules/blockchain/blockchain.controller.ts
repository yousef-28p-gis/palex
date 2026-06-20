import { Controller, Get, Param, Query } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private blockchainService: BlockchainService) {}

  @Get('fee/:network')
  async getNetworkFee(@Param('network') network: string) {
    const feeDetails = await this.blockchainService.getNetworkFeeWithDetails(network);
    
    return {
      success: true,
      data: feeDetails,
      message: feeDetails.isCached 
        ? `Current fee is $${feeDetails.feeUSD} USD (cached - updates every 2 minutes)`
        : `Current fee is $${feeDetails.feeUSD} USD (live from network)`,
    };
  }

  @Get('fee/:network/simple')
  async getSimpleFee(@Param('network') network: string) {
    const { fee } = await this.blockchainService.getNetworkFee(network);
    return {
      network: network.toUpperCase(),
      feeUSD: fee,
      currency: 'USD',
    };
  }

  @Get('status')
  async getStatus() {
    return {
      service: 'Blockchain Fee Service',
      updateInterval: 'Every 2 minutes',
      networks: ['TRC20', 'BEP20 (soon)'],
      caching: true,
    };
  }
}