import { Controller, Post, Get, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { SkipThrottle } from '@nestjs/throttler';
import { TradeService } from './trade.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StartTradeDto } from './dto/start-trade.dto';
import { SubmitPaymentProofDto } from './dto/submit-payment-proof.dto';
import { PrismaService } from '../../shared/services/prisma.service'; // ✅ تمت الإضافة

@Controller('trades')
export class TradeController {
  constructor(
    private tradeService: TradeService,
    private prisma: PrismaService, // ✅ تمت الإضافة
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async startTrade(@CurrentUser('id') userId: string, @Body() startTradeDto: StartTradeDto) {
    return this.tradeService.startTrade(userId, startTradeDto);
  }

  @SkipThrottle()
  @Get('user')
  @UseGuards(JwtAuthGuard)
  async getUserTrades(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    return this.tradeService.getUserTrades(userId, +page, +limit, status);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTradeById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tradeService.getTradeById(id, userId);
  }

  @Post(':id/payment-proof')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/payment-proofs',
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `proof-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const ext = extname(file.originalname).toLowerCase();
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && allowedTypes.test(ext)) {
        return cb(null, true);
      }
      cb(new Error('Only images are allowed (JPG, PNG)'), false);
    },
  }))
  async submitPaymentProof(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() submitProofDto: SubmitPaymentProofDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const imagePath = file ? file.path.replace(/\\/g, '/') : null;
    return this.tradeService.submitPaymentProof(id, userId, submitProofDto, imagePath);
  }

  @Post(':id/confirm-payment')
  @UseGuards(JwtAuthGuard)
  async confirmPayment(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tradeService.confirmPayment(id, userId);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelTrade(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tradeService.cancelTrade(id, userId);
  }

  // ✅ مرحلة ما قبل الصفقة - طلب تأكيد البائع
  @Post('request-confirmation')
  @UseGuards(JwtAuthGuard)
  async requestSellerConfirmation(
    @CurrentUser('id') userId: string,
    @Body() body: { offerId: string; amount: number },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return this.tradeService.requestSellerConfirmation(
      body.offerId,
      body.amount,
      userId,
      user?.fullName || 'مشتري',
    );
  }

  // ✅ البائع يؤكد وجوده
  @Post('confirm-presence')
  @UseGuards(JwtAuthGuard)
  async confirmSellerPresence(
    @CurrentUser('id') userId: string,
    @Body() body: { pendingId: string; offerId: string },
  ) {
    return this.tradeService.confirmSellerPresence(
      body.pendingId,
      body.offerId,
      userId,
    );
  }

  @Post(':id/mock-deposit')
  async mockDeposit(@Param('id') id: string) {
    return this.tradeService.mockDeposit(id, 'mock-user');
  }

  @Post(':id/mock-release')
  async mockRelease(@Param('id') id: string, @Body() body: { buyerAddress: string }) {
    return this.tradeService.mockRelease(id, 'mock-user', body.buyerAddress);
  }
}