import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SecureVaultService implements OnModuleInit {
  private readonly logger = new Logger(SecureVaultService.name);
  private masterKey: Buffer;
  private vaultPath: string;
  private secretsCache: Map<string, string> = new Map();
  private readonly MAX_RETRIES = 3;

  constructor() {
    this.vaultPath = path.join(process.cwd(), '.vault.enc');
    const encryptionKey = process.env.VAULT_MASTER_KEY;
    
    // ✅ التحقق الصارم من المفتاح الرئيسي
    if (!encryptionKey) {
      throw new Error('❌ VAULT_MASTER_KEY is required! Set it in .env file');
    }
    
    if (encryptionKey.length !== 64) {
      throw new Error(`❌ VAULT_MASTER_KEY must be exactly 64 hex characters (got ${encryptionKey.length})`);
    }
    
    if (!/^[a-fA-F0-9]{64}$/.test(encryptionKey)) {
      throw new Error('❌ VAULT_MASTER_KEY must contain only hexadecimal characters (0-9, a-f)');
    }
    
    this.masterKey = Buffer.from(encryptionKey, 'hex');
    this.logger.log('✅ Vault master key initialized (length: 32 bytes)');
  }

  async onModuleInit() {
    await this.initializeVault();
  }

  // ✅ دالة التحقق من صحة ملف Vault
  private async validateVaultIntegrity(): Promise<boolean> {
    if (!fs.existsSync(this.vaultPath)) {
      return false;
    }
    
    try {
      const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
      const parts = encrypted.split(':');
      
      // التحقق من التنسيق: يجب أن يكون 3 أجزاء (IV, AuthTag, Encrypted)
      if (parts.length !== 3) {
        this.logger.error('Vault file has invalid format');
        return false;
      }
      
      // محاولة فك التشفير
      const decrypted = this.decrypt(encrypted);
      JSON.parse(decrypted);
      return true;
    } catch (error) {
      this.logger.error(`Vault integrity check failed: ${error.message}`);
      return false;
    }
  }

  private async initializeVault() {
    if (!fs.existsSync(this.vaultPath)) {
      this.logger.warn('🔐 Vault not found, creating new secure vault...');
      await this.createNewVault();
    } else {
      // ✅ التحقق من صحة الملف قبل التحميل
      const isValid = await this.validateVaultIntegrity();
      if (!isValid) {
        this.logger.error('❌ Vault file is corrupted! Please restore from backup or contact support.');
        throw new Error('Vault integrity check failed - file corrupted');
      }
      this.logger.log('🔐 Vault found and verified, loading secrets into cache...');
      await this.loadCacheFromVault();
    }
  }

  private async createNewVault() {
    // ✅ المفاتيح التي يجب تخزينها بشكل آمن
    const requiredSecrets = [
      'MASTER_PRIVATE_KEY',      // TRC20 master private key
      'MASTER_BSC_PRIVATE_KEY',  // BSC master private key  
      'TRON_API_KEY',            // TronGrid API key
      'BSCSCAN_API_KEY',         // BSCScan API key
    ];

    const missingSecrets: string[] = [];
    const secrets: Record<string, string> = {};

    for (const secretName of requiredSecrets) {
      const value = process.env[secretName];
      if (!value) {
        missingSecrets.push(secretName);
      } else {
        secrets[secretName] = value;
      }
    }

    if (missingSecrets.length > 0) {
      this.logger.error(`❌ Missing required secrets: ${missingSecrets.join(', ')}`);
      throw new Error(`Cannot create vault: missing ${missingSecrets.join(', ')}`);
    }

    // ✅ تشفير وحفظ المفاتيح
    const encrypted = this.encrypt(JSON.stringify(secrets));
    fs.writeFileSync(this.vaultPath, encrypted);
    fs.chmodSync(this.vaultPath, 0o600); // قراءة/كتابة فقط للمالك
    
    this.logger.log('✅ Secure vault created with encrypted secrets');
    
    // ✅ تخزين المفاتيح في الكاش
    for (const [key, value] of Object.entries(secrets)) {
      this.secretsCache.set(key, value);
    }
  }

  private async loadCacheFromVault() {
    try {
      const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      const secrets = JSON.parse(decrypted);
      
      // تخزين في الكاش
      for (const [key, value] of Object.entries(secrets)) {
        this.secretsCache.set(key, value as string);
      }
      
      this.logger.log(`✅ Loaded ${this.secretsCache.size} secrets into cache`);
    } catch (error) {
      this.logger.error(`Failed to load vault: ${error.message}`);
      throw new Error('Vault corrupted or tampered with');
    }
  }

  private encrypt(text: string): string {
    // ✅ استخدام AES-256-GCM (أكثر أماناً من CBC)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    
    // تنسيق: IV (16) + AuthTag (16) + البيانات المشفرة
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decrypt(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  getSecret(key: string): string | null {
    // ✅ أولاً: البحث في الكاش
    if (this.secretsCache.has(key)) {
      return this.secretsCache.get(key)!;
    }
    
    // ✅ ثانياً: محاولة قراءة من ملف الـ Vault مباشرة
    try {
      if (!fs.existsSync(this.vaultPath)) {
        this.logger.warn(`Vault not found for secret: ${key}`);
        return null;
      }
      
      const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
      const decrypted = this.decrypt(encrypted);
      const secrets = JSON.parse(decrypted);
      
      if (secrets[key]) {
        this.secretsCache.set(key, secrets[key]);
        return secrets[key];
      }
    } catch (error) {
      this.logger.error(`Failed to get secret ${key}: ${error.message}`);
    }
    
    return null;
  }

  async updateSecret(key: string, value: string): Promise<boolean> {
    try {
      // قراءة المفاتيح الحالية
      let secrets: Record<string, string> = {};
      
      if (fs.existsSync(this.vaultPath)) {
        const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
        const decrypted = this.decrypt(encrypted);
        secrets = JSON.parse(decrypted);
      }
      
      // تحديث المفتاح
      secrets[key] = value;
      this.secretsCache.set(key, value);
      
      // حفظ مرة أخرى
      const newEncrypted = this.encrypt(JSON.stringify(secrets));
      fs.writeFileSync(this.vaultPath, newEncrypted);
      fs.chmodSync(this.vaultPath, 0o600);
      
      this.logger.log(`✅ Secret "${key}" updated in vault`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update secret ${key}: ${error.message}`);
      return false;
    }
  }

  private clearEnvSecrets() {
    // ✅ مسح جميع المفاتيح الخاصة من process.env
    const secretKeys = ['MASTER_PRIVATE_KEY', 'MASTER_BSC_PRIVATE_KEY', 'TRON_API_KEY', 'BSCSCAN_API_KEY'];
    
    for (const key of secretKeys) {
      if (process.env[key]) {
        delete process.env[key];
        this.logger.debug(`🔒 Cleared ${key} from environment`);
      }
    }
    
    this.logger.log('🔒 All private keys cleared from environment memory');
  }

  async rotateMasterKey(oldKey: string, newKey: string): Promise<boolean> {
    if (!fs.existsSync(this.vaultPath)) {
      this.logger.error('Vault not found for rotation');
      return false;
    }
    
    try {
      // فك التشفير بالمفتاح القديم
      const oldMasterKey = Buffer.from(oldKey, 'hex');
      const encrypted = fs.readFileSync(this.vaultPath, 'utf8');
      const [ivHex, authTagHex, data] = encrypted.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', oldMasterKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      const secrets = JSON.parse(decrypted);
      
      // إعادة التشفير بالمفتاح الجديد
      const newMasterKey = Buffer.from(newKey, 'hex');
      const newIv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', newMasterKey, newIv);
      
      let newEncrypted = cipher.update(JSON.stringify(secrets), 'utf8', 'hex');
      newEncrypted += cipher.final('hex');
      const newAuthTag = cipher.getAuthTag();
      
      const newVaultContent = `${newIv.toString('hex')}:${newAuthTag.toString('hex')}:${newEncrypted}`;
      fs.writeFileSync(this.vaultPath, newVaultContent);
      fs.chmodSync(this.vaultPath, 0o600);
      
      this.logger.log('✅ Master key rotated successfully');
      return true;
    } catch (error) {
      this.logger.error(`Failed to rotate master key: ${error.message}`);
      return false;
    }
  }
}