import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../shared/services/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateWalletsDto } from './dto/update-wallets.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateWorkHoursDto } from './dto/update-work-hours.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        governorate: true,
        role: true,
        kycStatus: true,
        trustLevel: true,
        totalTrades: true,
        successRate: true,
        averageRating: true,
        trc20Wallet: true,
        bscWallet: true,
        isSuspended: true,
        createdAt: true,
        profileImageUrl: true,
        workHoursStart: true,
        workHoursEnd: true,
        workDays: true,
        isActiveNow: true,
        lastSeenAt: true,
      },
    });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        governorate: dto.governorate,
      },
      select: { id: true, fullName: true, phone: true, governorate: true },
    });
  }

  async updateWallets(userId: string, dto: UpdateWalletsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        trc20Wallet: dto.trc20Wallet,
        bscWallet: dto.bscWallet,
      },
      select: { id: true, trc20Wallet: true, bscWallet: true },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('كلمة المرور الحالية غير صحيحة');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hashedPassword },
    });

    return { success: true, message: 'تم تغيير كلمة المرور بنجاح' };
  }

  // ==================== الصورة الشخصية ====================

  async updateProfileImage(userId: string, imageUrl: string) {
    const oldUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true },
    });
    
    if (oldUser?.profileImageUrl) {
      const oldImagePath = path.join(process.cwd(), oldUser.profileImageUrl.replace(/^\//, ''));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: imageUrl },
      select: { id: true, profileImageUrl: true },
    });
  }

  async deleteProfileImage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profileImageUrl: true },
    });
    
    if (user?.profileImageUrl) {
      const imagePath = path.join(process.cwd(), user.profileImageUrl.replace(/^\//, ''));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl: null },
      select: { id: true, profileImageUrl: true },
    });
  }

  // ==================== الجلسات ====================

  async getUserSessions(userId: string) {
    const sessions = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });

    return sessions.map(session => ({
      id: session.id,
      device: this.parseUserAgent(session.userAgent),
      lastActive: session.createdAt,
      isCurrent: false,
      ip: session.ipAddress,
    }));
  }

  async logoutSession(sessionId: string, userId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });
    
    if (!session) throw new NotFoundException('الجلسة غير موجودة');
    
    await this.prisma.refreshToken.delete({ where: { id: sessionId } });
    return { success: true, message: 'تم تسجيل الخروج من هذه الجلسة' };
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    return { success: true, message: 'تم تسجيل الخروج من جميع الأجهزة' };
  }

  private parseUserAgent(userAgent: string | null): string {
    if (!userAgent) return 'جهاز غير معروف';
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android';
    
    return 'متصفح ويب';
  }

  // ==================== ساعات العمل والتواجد ====================

  async getWorkHours(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        workHoursStart: true,
        workHoursEnd: true,
        workDays: true,
        isActiveNow: true,
        lastSeenAt: true,
      },
    });
    
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    
    return {
      workHoursStart: user.workHoursStart || '09:00',
      workHoursEnd: user.workHoursEnd || '21:00',
      workDays: user.workDays || [0, 1, 2, 3, 4, 5, 6],
      isActiveNow: user.isActiveNow || false,
      lastSeenAt: user.lastSeenAt,
    };
  }

  async updateWorkHours(userId: string, dto: UpdateWorkHoursDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    const updateData: any = {};
    
    if (dto.workHoursStart !== undefined) updateData.workHoursStart = dto.workHoursStart;
    if (dto.workHoursEnd !== undefined) updateData.workHoursEnd = dto.workHoursEnd;
    if (dto.workDays !== undefined) updateData.workDays = dto.workDays;
    
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        workHoursStart: true,
        workHoursEnd: true,
        workDays: true,
      },
    });
    
    return { success: true, message: 'تم تحديث ساعات العمل', data: updated };
  }

  async updatePresence(userId: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        isActiveNow: isActive,
        lastSeenAt: isActive ? new Date() : undefined,
      },
      select: {
        id: true,
        isActiveNow: true,
        lastSeenAt: true,
      },
    });
  }

  async getUserPresence(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        isActiveNow: true,
        lastSeenAt: true,
        workHoursStart: true,
        workHoursEnd: true,
        workDays: true,
      },
    });
    
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    
    // ✅ استخدام توقيت غزة
    const gazaTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Gaza' });
    const gazaDate = new Date(gazaTime);
    const currentHour = gazaDate.getHours();
    const currentMinute = gazaDate.getMinutes();
    const currentDay = gazaDate.getDay();
    
    let isWithinWorkHours = true;
    
    if (user.workHoursStart && user.workHoursEnd) {
      const [startHour, startMinute] = user.workHoursStart.split(':').map(Number);
      const [endHour, endMinute] = user.workHoursEnd.split(':').map(Number);
      
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      
      isWithinWorkHours = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    }
    
    const workDaysArray = (user.workDays as number[]) || [0, 1, 2, 3, 4, 5, 6];
    const isWorkDay = workDaysArray.includes(currentDay);
    
    // ✅ مهلة 3 دقائق: إذا كان البائع متصلاً خلال آخر 3 دقائق نعتبره متاحاً
    const RECENT_ACTIVITY_MS = 3 * 60 * 1000;
    const recentlyActive = user.lastSeenAt && (new Date().getTime() - new Date(user.lastSeenAt).getTime()) < RECENT_ACTIVITY_MS;
    
    return {
      userId: user.id,
      fullName: user.fullName,
      isOnline: user.isActiveNow || recentlyActive,
      isAvailable: isWithinWorkHours && isWorkDay,
      isActiveNow: user.isActiveNow,
      lastSeenAt: user.lastSeenAt,
      isWithinWorkHours,
      isWorkDay,
      workHours: {
        start: user.workHoursStart || '09:00',
        end: user.workHoursEnd || '21:00',
      },
    };
  }
}