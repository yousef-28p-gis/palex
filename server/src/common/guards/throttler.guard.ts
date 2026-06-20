import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // استخدام IP + User-Agent لتحديد الطلبات
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return `${ip}:${userAgent}`;
  }

  protected errorMessage = 'لقد تجاوزت الحد المسموح من المحاولات. يرجى المحاولة بعد دقيقة.';
}