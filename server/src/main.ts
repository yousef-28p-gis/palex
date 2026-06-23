import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as express from 'express';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { SecureVaultService } from './shared/services/secure-vault.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  
  // ✅ تحميل المفاتيح من Vault
  const vault = new SecureVaultService();
  await vault.onModuleInit();
  process.env.MASTER_PRIVATE_KEY = vault.getSecret('MASTER_PRIVATE_KEY') || '';
  process.env.MASTER_BSC_PRIVATE_KEY = vault.getSecret('MASTER_BSC_PRIVATE_KEY') || '';
  process.env.TRON_API_KEY = vault.getSecret('TRON_API_KEY') || '';
  process.env.BSCSCAN_API_KEY = vault.getSecret('BSCSCAN_API_KEY') || '';

  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
  const nodeEnv = configService.get('NODE_ENV') || 'development';
  const isProduction = nodeEnv === 'production';
  
  // ✅ قائمة النطاقات المسموح بها (CORS Whitelist)
  const allowedOrigins = isProduction 
    ? [
        'https://palex.com',
        'https://www.palex.com',
        'https://api.palex.com',
        'https://admin.palex.com',
        frontendUrl,
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        frontendUrl,
      ];
  
  const uniqueOrigins = [...new Set(allowedOrigins.filter(origin => origin && origin !== 'undefined'))];
  
  logger.log(`🌐 CORS allowed origins (${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}):`);
  uniqueOrigins.forEach(origin => logger.log(`   - ${origin}`));
  
  // Helmet (أمان)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "https:", "http://localhost:4000", "http://localhost:3000", "https://tronscan.org"],
        connectSrc: ["'self'", "https://api.trongrid.io", "https://api.bscscan.com"],
        fontSrc: ["'self'", "https:", "data:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: isProduction ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    } : false,
  }));
  
  app.use(compression());
  app.use(cookieParser());

  // ✅ Rate Limiting - مع تخطي المسارات العامة
  app.use(
    rateLimit({
      windowMs: 60 * 1000,        // دقيقة واحدة
      max: 500,                   // 500 طلب في الدقيقة
      skip: (req) => {
        // ✅ تخطي الـ limit للمسارات العامة والآمنة
        const skipPaths = [
          '/api/rates',
          '/api/auth/me',
          '/api/trades',
          '/api/offers',
          '/api/health',
          '/api/wallet/stats',
          '/api/wallet/balance',
        ];
        return skipPaths.some(path => req.path.includes(path));
      },
      message: {
        statusCode: 429,
        message: 'لقد تجاوزت الحد المسموح من الطلبات. يرجى المحاولة بعد دقيقة.',
        error: 'Too Many Requests'
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // ✅ CORS - التكوين الآمن
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      
      if (!isProduction && origin.includes('localhost')) {
        return callback(null, true);
      }
      
      // ✅ السماح لأي نطاق trycloudflare.com (tunnels مؤقتة للـ dev)
      if (!isProduction && /\.trycloudflare\.com$/.test(origin)) {
        return callback(null, true);
      }
      
      if (uniqueOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      logger.warn(`❌ CORS blocked origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400,
  });

  // خدمة الملفات الثابتة
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    },
  });

  app.setGlobalPrefix('api');
  
  // التحقق من الصحة
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => {
      const messages = errors.map(error => 
        `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`
      );
      return new BadRequestException(messages);
    },
  }));

  const port = configService.get('PORT') || 4000;
  await app.listen(port);

  logger.log(`🚀 Server running on http://localhost:${port}`);
  logger.log(`🔒 CORS is ${isProduction ? 'ENABLED (strict mode)' : 'enabled (development mode)'}`);
  logger.log(`✅ Rate limit: 500 requests per minute (skipping public paths)`);
}

bootstrap();