import { Injectable, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../shared/services/prisma.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. التحقق من صحة التوكن
    const isValid = await super.canActivate(context) as boolean;
    if (!isValid) {
      return false;
    }

    // 2. الحصول على المستخدم من الطلب
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || !user.id) {
      return false;
    }

    // 3. ✅ التحقق من أن الحساب غير موقوف (مرة واحدة هنا فقط!)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isSuspended: true, suspendedUntil: true },
    });

    if (dbUser?.isSuspended) {
      const isStillSuspended = dbUser.suspendedUntil ? new Date(dbUser.suspendedUntil) > new Date() : true;
      if (isStillSuspended) {
        throw new ForbiddenException('🚫 حسابك موقوف. لا يمكنك القيام بأي عملية.');
      }
    }

    return true;
  }
}