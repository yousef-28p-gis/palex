import { Controller, Post, Get, Body, UseGuards, UseInterceptors, UploadedFiles, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Controller('kyc')
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private kycService: KycService) {}

  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'idFrontImage', maxCount: 1 }], {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { 
        fileSize: 5 * 1024 * 1024, // 5 ميجابايت كحد أقصى
      },
      fileFilter: (req, file, cb) => {
        // ✅ التحقق من نوع الملف
        const allowedTypes = /jpeg|jpg|png|webp/;
        const ext = extname(file.originalname).toLowerCase();
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && allowedTypes.test(ext)) {
          return cb(null, true);
        }
        
        cb(new BadRequestException('نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, WEBP'), false);
      },
    }),
  )
  async submitKyc(
    @CurrentUser('id') userId: string,
    @Body() submitKycDto: SubmitKycDto,
    @UploadedFiles() files: { idFrontImage?: Express.Multer.File[] },
  ) {
    // ✅ التحقق من وجود الملف
    if (!files?.idFrontImage?.[0]) {
      throw new BadRequestException('صورة الهوية مطلوبة');
    }
    
    // ✅ التحقق من حجم الملف (أمان إضافي)
    const file = files.idFrontImage[0];
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('حجم الصورة يتجاوز 5 ميجابايت');
    }
    
    return this.kycService.submitKyc(userId, submitKycDto, files);
  }

  @Get('status')
  async getKycStatus(@CurrentUser('id') userId: string) {
    return this.kycService.getKycStatus(userId);
  }
}