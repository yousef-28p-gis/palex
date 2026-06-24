import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private isEnabled: boolean;

  constructor(private configService: ConfigService) {
    this.isEnabled = !!this.configService.get('SMTP_HOST');
    if (this.isEnabled) {
      this.initTransporter();
    } else {
      this.logger.warn('SMTP not configured. Email sending disabled.');
    }
  }

  private initTransporter() {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get('SMTP_PORT'),
      secure: this.configService.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendEmail(options: { to: string; subject: string; html: string }): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.debug(`Email disabled - would send to ${options.to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.configService.get('SMTP_FROM', 'noreply@palex.com'),
        ...options,
      });
      this.logger.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`);
      return false;
    }
  }

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean> {
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    
    return this.sendEmail({
      to,
      subject: 'إعادة تعيين كلمة المرور - PALEX',
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">مرحباً ${name}!</h2>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
            إعادة تعيين كلمة المرور
          </a>
          <p style="font-size: 12px; color: #666;">هذا الرابط صالح لمدة ساعة واحدة.</p>
        </div>
      `,
    });
  }
}