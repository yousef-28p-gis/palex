import { Controller, Get, Put, Post, Delete, Body, UseGuards, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateWalletsDto } from './dto/update-wallets.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateWorkHoursDto } from './dto/update-work-hours.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private userService: UserService,
  ) {}

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(@CurrentUser('id') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, updateProfileDto);
  }

  @Post('wallets')
  async updateWallets(@CurrentUser('id') userId: string, @Body() updateWalletsDto: UpdateWalletsDto) {
    return this.userService.updateWallets(userId, updateWalletsDto);
  }

  @Post('change-password')
  async changePassword(@CurrentUser('id') userId: string, @Body() changePasswordDto: ChangePasswordDto) {
    return this.userService.changePassword(userId, changePasswordDto);
  }

  // ✅ دوال الصورة الشخصية
  @Post('profile-image')
  @UseInterceptors(FileInterceptor('profileImage', {
    storage: diskStorage({
      destination: './uploads/profiles',
      filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        cb(null, `profile-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|webp/;
      const ext = extname(file.originalname).toLowerCase();
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && allowedTypes.test(ext)) {
        return cb(null, true);
      }
      cb(new Error('Only images are allowed (JPG, PNG, WEBP)'), false);
    },
  }))
  async uploadProfileImage(@CurrentUser('id') userId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { success: false, message: 'لم يتم رفع أي ملف' };
    }
    const imageUrl = `/uploads/profiles/${file.filename}`;
    const result = await this.userService.updateProfileImage(userId, imageUrl);
    return { success: true, message: 'تم تحديث الصورة الشخصية', data: result };
  }

  @Delete('profile-image')
  async deleteProfileImage(@CurrentUser('id') userId: string) {
    const result = await this.userService.deleteProfileImage(userId);
    return { success: true, message: 'تم حذف الصورة الشخصية', data: result };
  }

  // ✅ دوال الجلسات
  @Get('sessions')
  async getSessions(@CurrentUser('id') userId: string) {
    return this.userService.getUserSessions(userId);
  }

  @Post('sessions/:id/logout')
  async logoutSession(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.userService.logoutSession(sessionId, userId);
  }

  @Post('sessions/logout-all')
  async logoutAllSessions(@CurrentUser('id') userId: string) {
    return this.userService.logoutAllSessions(userId);
  }

  // ✅ دوال ساعات العمل
  @Get('work-hours')
  async getWorkHours(@CurrentUser('id') userId: string) {
    return this.userService.getWorkHours(userId);
  }

  @Put('work-hours')
  async updateWorkHours(@CurrentUser('id') userId: string, @Body() updateWorkHoursDto: UpdateWorkHoursDto) {
    return this.userService.updateWorkHours(userId, updateWorkHoursDto);
  }

  // ✅ دالة التحقق من تواجد المستخدم (للمستخدمين الآخرين)
  @Get(':id/presence')
  async getUserPresence(@Param('id') userId: string) {
    return this.userService.getUserPresence(userId);
  }

  // ✅ دالة تحديث الحالة (نشط/غير نشط) - تُستدعى تلقائياً عبر WebSocket
  @Post('presence')
  async updatePresence(@CurrentUser('id') userId: string, @Body('isActive') isActive: boolean) {
    return this.userService.updatePresence(userId, isActive);
  }

}