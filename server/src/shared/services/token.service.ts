import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  generateAccessToken(userId: string, email: string, role: string): string {
    return this.jwtService.sign(
      { userId, email, role, type: 'access' },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      },
    );
  }

  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { userId, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      },
    );
  }

  generatePasswordResetToken(userId: string): string {
    return this.jwtService.sign(
      { userId, type: 'password-reset' },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1h',
      },
    );
  }

  verifyToken(token: string, isRefresh: boolean = false): any {
    const secret = isRefresh
      ? this.configService.get('JWT_REFRESH_SECRET')
      : this.configService.get('JWT_SECRET');
    return this.jwtService.verify(token, { secret });
  }

  generateTwoFactorSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  generateRandomCode(length: number = 6): string {
    return crypto.randomInt(100000, 999999).toString();
  }
}