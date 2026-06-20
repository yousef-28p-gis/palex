import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    this.logger.log(`ENCRYPTION_KEY length: ${encryptionKey?.length || 0}`);
    
    // ✅ التحقق من وجود المفتاح
    if (!encryptionKey) {
      this.logger.warn('⚠️ ENCRYPTION_KEY not found in .env, using default key (NOT SECURE FOR PRODUCTION!)');
      // مفتاح افتراضي للتطوير فقط (لا تستخدمه في الإنتاج)
      const defaultKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      this.key = Buffer.from(defaultKey, 'hex');
    } 
    // ✅ التحقق من طول المفتاح (يجب أن يكون 64 حرف سداسي عشري = 32 بايت)
    else if (encryptionKey.length !== 64) {
      this.logger.warn(`⚠️ ENCRYPTION_KEY length is ${encryptionKey.length}, should be 64. Using default key.`);
      const defaultKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      this.key = Buffer.from(defaultKey, 'hex');
    } 
    // ✅ التحقق من أن المفتاح يحتوي فقط على أحرف سداسية عشرية
    else if (!/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
      this.logger.warn('⚠️ ENCRYPTION_KEY contains invalid characters. Using default key.');
      const defaultKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      this.key = Buffer.from(defaultKey, 'hex');
    }
    else {
      this.key = Buffer.from(encryptionKey, 'hex');
      this.logger.log('✅ Encryption key validated successfully');
    }
  }

  /**
   * تشفير نص
   * @param text النص المراد تشفيره
   * @returns النص المشفر بصيغة IV:EncryptedData
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * فك تشفير نص
   * @param encryptedText النص المشفر بصيغة IV:EncryptedData
   * @returns النص الأصلي
   */
  decrypt(encryptedText: string): string {
    const [ivHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * التحقق مما إذا كان النص مشفراً
   * @param text النص المراد التحقق منه
   * @returns true إذا كان النص مشفراً، false إذا كان نصاً عادياً
   */
  isEncrypted(text: string): boolean {
    if (!text) return false;
    return text.includes(':') && text.split(':')[0].length === 32;
  }

  /**
   * التحقق من صحة المفتاح المستخدم للتشفير
   * @returns true إذا كان المفتاح صالحاً وآمناً
   */
  isKeyValid(): boolean {
    // التحقق من أن المفتاح ليس المفتاح الافتراضي
    const defaultKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const isUsingDefault = this.key.toString('hex') === defaultKey;
    
    if (isUsingDefault) {
      this.logger.warn('⚠️ Using default encryption key - NOT SECURE for production!');
    }
    
    return !isUsingDefault;
  }

  /**
   * الحصول على بصمة المفتاح (لأغراض المراقبة فقط)
   * @returns أول 8 أحرف من المفتاح بعد التجزئة
   */
  getKeyFingerprint(): string {
    const hash = crypto.createHash('sha256').update(this.key).digest('hex');
    return hash.substring(0, 8);
  }
}