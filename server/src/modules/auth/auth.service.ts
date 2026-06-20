import { Injectable, ConflictException, UnauthorizedException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../shared/services/prisma.service';
import { TokenService } from '../../shared/services/token.service';
import { MailService } from '../../shared/services/mail.service';
import { AuditService } from '../../shared/services/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private tokenService: TokenService,
    private mailService: MailService,
    private auditService: AuditService,
  ) {}

  async register(registerDto: RegisterDto, ip: string, userAgent: string) {
    const { email, password, fullName, phone } = registerDto;

    this.validateRegistration(registerDto);

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new ConflictException('البريد الإلكتروني مسجل مسبقاً');

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        fullName,
        phone,
        emailVerified: true,
        kycStatus: 'none',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        kycStatus: true,
      },
    });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    await this.mailService.sendEmail({
      to: user.email,
      subject: '✅ تأكيد البريد الإلكتروني - PalEscrow',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">مرحباً ${user.fullName}!</h2>
          <p>شكراً لتسجيلك في PalEscrow. يرجى تأكيد بريدك الإلكتروني بالضغط على الرابط أدناه:</p>
          <a href="${frontendUrl}/verify-email?token=${verificationToken}" 
             style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            تأكيد البريد الإلكتروني
          </a>
          <p style="font-size: 12px; color: #666;">هذا الرابط صالح لمدة 24 ساعة.</p>
        </div>
      `,
    });

    const accessToken = this.tokenService.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.saveRefreshToken(user.id, refreshToken, ip, userAgent);

    return {
      success: true,
      message: 'تم إنشاء الحساب بنجاح. يرجى تأكيد بريدك الإلكتروني.',
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(loginDto: LoginDto, ip: string, userAgent: string, response: Response) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      await this.auditService.logFailedLogin(email, ip, userAgent, 'User not found');
      throw new UnauthorizedException('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      await this.auditService.logFailedLogin(email, ip, userAgent, 'Invalid password');
      throw new UnauthorizedException('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    // ✅ التحقق من الحظر قبل تسجيل الدخول
    if (user.isSuspended) {
      const isStillSuspended = user.suspendedUntil ? new Date(user.suspendedUntil) > new Date() : true;
      if (isStillSuspended) {
        const message = user.suspensionReason || '🚫 حسابك موقوف. لا يمكنك تسجيل الدخول. يرجى مراجعة الدعم الفني عبر واتساب.';
        throw new UnauthorizedException(message);
      }
    }

    await this.auditService.logSuccessfulLogin(user.id, email, ip);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip },
    });

    const accessToken = this.tokenService.generateAccessToken(user.id, user.email, user.role);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.saveRefreshToken(user.id, refreshToken, ip, userAgent);

    response.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return {
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        role: user.role,
        kycStatus: user.kycStatus,
        trustLevel: user.trustLevel,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
      },
      accessToken,
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('الرابط غير صالح أو منتهي الصلاحية');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { success: true, message: 'تم تأكيد البريد الإلكتروني بنجاح' };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');
    if (user.emailVerified) throw new BadRequestException('البريد الإلكتروني مؤكد بالفعل');

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
    });

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    await this.mailService.sendEmail({
      to: user.email,
      subject: '✅ إعادة إرسال رابط التأكيد - PalEscrow',
      html: `<div dir="rtl"><h2>مرحباً ${user.fullName}</h2><p>يرجى تأكيد بريدك الإلكتروني:</p><a href="${frontendUrl}/verify-email?token=${verificationToken}">تأكيد البريد الإلكتروني</a></div>`,
    });

    return { success: true, message: 'تم إرسال رابط التأكيد مرة أخرى' };
  }

  async refreshToken(refreshToken: string, response: Response) {
    if (!refreshToken) throw new UnauthorizedException('Refresh token مطلوب');

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!tokenRecord) throw new UnauthorizedException('Refresh token غير صالح');

    const accessToken = this.tokenService.generateAccessToken(
      tokenRecord.user.id,
      tokenRecord.user.email,
      tokenRecord.user.role,
    );
    
    const newRefreshToken = this.tokenService.generateRefreshToken(tokenRecord.user.id);

    await this.prisma.refreshToken.deleteMany({ where: { userId: tokenRecord.user.id } });
    await this.saveRefreshToken(tokenRecord.user.id, newRefreshToken);

    response.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    });

    return { accessToken };
  }

  async logout(userId: string, response: Response) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    response.clearCookie('refreshToken', { path: '/api/auth' });
    return { success: true, message: 'تم تسجيل الخروج' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        kycStatus: true,
        trustLevel: true,
        totalTrades: true,
        successRate: true,
        averageRating: true,
        trc20Wallet: true,
        bscWallet: true,
        isSuspended: true,
        suspensionReason: true,
        suspendedUntil: true,
        createdAt: true,
        emailVerified: true,
        profileImageUrl: true,
      },
    });
    if (!user) throw new UnauthorizedException('المستخدم غير موجود');
    return user;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { success: true, message: 'إذا كان البريد مسجلاً، ستصلك تعليمات إعادة التعيين' };
    }

    const resetToken = this.tokenService.generatePasswordResetToken(user.id);
    
    await this.prisma.passwordResetToken.create({
      data: {
        token: resetToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.mailService.sendPasswordResetEmail(email, user.fullName, resetToken);

    return { success: true, message: 'تم إرسال رابط إعادة التعيين' };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetRecord = await this.prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() }, used: false },
      include: { user: true },
    });

    if (!resetRecord) throw new UnauthorizedException('الرابط غير صالح أو منتهي الصلاحية');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await this.prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: hashedPassword },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: resetRecord.userId } });

    return { success: true, message: 'تم إعادة تعيين كلمة المرور بنجاح' };
  }

  async resetMyKycStatus(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('المستخدم غير موجود');

    if (user.kycStatus !== 'rejected') {
      throw new BadRequestException('لا يمكن إعادة التقديم إلا إذا كان طلبك مرفوضاً');
    }

    await this.prisma.kycRequest.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'none' },
    });

    return { success: true, message: 'تم إعادة تعيين الحالة، يمكنك الآن إعادة تقديم طلب التوثيق' };
  }

  private validateRegistration(dto: RegisterDto) {
    if (!dto.fullName || dto.fullName.length < 3) {
      throw new BadRequestException('❌ الاسم الكامل يجب أن يكون 3 أحرف على الأقل');
    }
    const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
    if (!emailRegex.test(dto.email)) {
      throw new BadRequestException('❌ البريد الإلكتروني غير صالح (مثال: name@domain.com)');
    }
    const phoneRegex = /^05[0-9]{8}$/;
    if (!phoneRegex.test(dto.phone)) {
      throw new BadRequestException('❌ رقم الجوال غير صالح لفلسطين (يجب أن يبدأ بـ 05 ويتكون من 10 أرقام)');
    }
    if (dto.password.length < 6) {
      throw new BadRequestException('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    }
    if (!/[A-Z]/.test(dto.password)) {
      throw new BadRequestException('❌ كلمة المرور يجب أن تحتوي على حرف كبير (A-Z)');
    }
    if (!/[a-z]/.test(dto.password)) {
      throw new BadRequestException('❌ كلمة المرور يجب أن تحتوي على حرف صغير (a-z)');
    }
    if (!/[0-9]/.test(dto.password)) {
      throw new BadRequestException('❌ كلمة المرور يجب أن تحتوي على رقم (0-9)');
    }
  }

  private async saveRefreshToken(userId: string, token: string, ip?: string, userAgent?: string) {
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    });
  }
}