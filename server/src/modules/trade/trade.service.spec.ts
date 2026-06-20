// ===== FILE: c:\Users\PC\Desktop\p2p-backend\src\modules\trade\trade.service.spec.ts =====
import { Test, TestingModule } from '@nestjs/testing';
import { TradeService } from './trade.service';
import { PrismaService } from '../../shared/services/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { getQueueToken } from '@nestjs/bull';

describe('TradeService', () => {
  let service: TradeService;
  let prisma: PrismaService;
  let blockchain: BlockchainService;

  const mockPrisma = {
    offer: { findFirst: jest.fn() },
    trade: { create: jest.fn(), update: jest.fn() },
    user: { update: jest.fn() },
  };

  const mockBlockchain = {
    createEscrowAddress: jest.fn().mockResolvedValue('Tmockaddress'),
    releaseUSDT: jest.fn().mockResolvedValue({ success: true, txHash: '0xtest' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: { sendNotification: jest.fn() } },
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: getQueueToken('trade-timeouts'), useValue: { add: jest.fn() } },
        { provide: getQueueToken('notification'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get<TradeService>(TradeService);
    prisma = module.get<PrismaService>(PrismaService);
    blockchain = module.get<BlockchainService>(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startTrade', () => {
    it('should create a trade and escrow address', async () => {
      const offer = {
        id: 'offer1',
        sellerId: 'seller1',
        minAmount: 10,
        maxAmount: 100,
        price: 3.5,
        network: 'trc20',
        fiatCurrency: 'ils',
        status: 'active',
      };
      mockPrisma.offer.findFirst.mockResolvedValue(offer);
      mockPrisma.trade.create.mockResolvedValue({ id: 'trade1', status: 'waiting_seller_deposit' });

      const result = await service.startTrade('buyer1', { offerId: 'offer1', amountUsdt: 50 });

      expect(mockBlockchain.createEscrowAddress).toHaveBeenCalledWith('trade1', 'trc20');
      expect(mockPrisma.trade.update).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw if offer not found', async () => {
      mockPrisma.offer.findFirst.mockResolvedValue(null);
      await expect(service.startTrade('buyer1', { offerId: 'invalid', amountUsdt: 50 })).rejects.toThrow('العرض غير متاح');
    });
  });
});