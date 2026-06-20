import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(private prisma: PrismaService) {}

  async submitKyc(userId: string, dto: SubmitKycDto, files: { idFrontImage?: Express.Multer.File[] }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    if (user.kycStatus === 'approved') throw new BadRequestException('حسابك موثق بالفعل');
    if (user.kycStatus === 'pending') throw new BadRequestException('لديك طلب قيد المراجعة بالفعل');

    if (!files.idFrontImage?.[0]) {
      throw new BadRequestException('صورة الهوية مطلوبة');
    }

    const idFrontPath = files.idFrontImage[0].path.replace(/\\/g, '/');

    // تحديث بيانات المستخدم
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        nationalId: dto.nationalId,
        phone: dto.phone,
      },
    });

    // ✅ حذف أي طلب KYC سابق لنفس المستخدم
    await this.prisma.kycRequest.deleteMany({
      where: { userId: userId },
    });

    // إنشاء طلب KYC جديد
    const kycRequest = await this.prisma.kycRequest.create({
      data: {
        userId,
        fullName: dto.fullName,
        nationalId: dto.nationalId,
        phone: dto.phone,
        bankName: dto.bankName,
        idFrontImage: idFrontPath,
        status: 'pending',
      },
    });

    await this.prisma.user.update({ 
      where: { id: userId }, 
      data: { kycStatus: 'pending' } 
    });

    this.logger.log(`✅ New KYC request submitted by user ${userId}`);

    return { success: true, message: 'تم إرسال طلب التوثيق', requestId: kycRequest.id };
  }

  async getKycStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id: userId }, 
      select: { kycStatus: true } 
    });
    const latestRequest = await this.prisma.kycRequest.findFirst({ 
      where: { userId }, 
      orderBy: { createdAt: 'desc' } 
    });
    return { status: user?.kycStatus || 'none', request: latestRequest };
  }
}