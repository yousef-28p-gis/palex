import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ✅ التحقق من صحة التوكن — JwtStrategy يتولى كل شيء (فحص المستخدم + الحظر)
    const isValid = await super.canActivate(context) as boolean;
    if (!isValid) {
      return false;
    }

    return true;
  }
}