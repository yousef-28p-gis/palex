import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logFailedLogin(email: string, ip: string, userAgent: string, reason: string) {
    const hash = crypto.createHash('sha256')
      .update(`${email}-${Date.now()}-${ip}`)
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        action: 'FAILED_LOGIN_ATTEMPT',
        metadata: {
          email,
          ip,
          userAgent,
          reason,
          timestamp: new Date().toISOString(),
        },
        hash,
      },
    });

    this.logger.warn(`Failed login attempt: ${email} from ${ip} - ${reason}`);
  }

  async logSuccessfulLogin(userId: string, email: string, ip: string) {
    const hash = crypto.createHash('sha256')
      .update(`${userId}-${Date.now()}`)
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        adminId: userId,
        action: 'SUCCESSFUL_LOGIN',
        targetUserId: userId,
        metadata: { email, ip, timestamp: new Date().toISOString() },
        hash,
      },
    });
  }

  async logApiAbuse(ip: string, endpoint: string, method: string, attemptCount: number) {
    const hash = crypto.createHash('sha256')
      .update(`${ip}-${Date.now()}`)
      .digest('hex');

    await this.prisma.auditLog.create({
      data: {
        action: 'API_ABUSE_DETECTED',
        metadata: {
          ip,
          endpoint,
          method,
          attemptCount,
          timestamp: new Date().toISOString(),
        },
        hash,
      },
    });

    this.logger.warn(`API abuse detected: ${ip} - ${attemptCount} attempts on ${endpoint}`);
  }
}