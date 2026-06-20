import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip;
    const userId = req.user?.id || 'anonymous';
    const endpoint = req.route?.path || req.url;
    return `${userId}:${ip}:${endpoint}`;
  }

  protected throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    
    let message = 'لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة بعد دقيقة.';
    
    // رسائل مخصصة حسب المسار
    if (url.includes('/auth/login')) {
      message = 'لقد تجاوزت الحد المسموح من محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.';
    } else if (url.includes('/auth/register')) {
      message = 'لقد تجاوزت الحد المسموح من محاولات إنشاء حساب. يرجى المحاولة بعد ساعة.';
    } else if (url.includes('/disputes')) {
      message = 'لقد تجاوزت الحد المسموح من فتح النزاعات. يرجى المحاولة غداً.';
    } else if (url.includes('/trades') && method === 'POST') {
      message = 'لقد تجاوزت الحد المسموح من إنشاء الصفقات. يرجى المحاولة بعد ساعة.';
    }
    
    throw new ThrottlerException(message);
  }
}