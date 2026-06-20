import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const start = Date.now();

    // تجاهل تسجيل مسارات health check
    const isHealthCheck = url === '/api/health' || url.includes('/health');
    
    return next.handle().pipe(
      tap({
        next: () => {
          if (!isHealthCheck) {
            const response = context.switchToHttp().getResponse();
            const duration = Date.now() - start;
            this.logger.log(`${method} ${url} ${response.statusCode} - ${duration}ms - ${userAgent} ${ip}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - start;
          this.logger.error(`${method} ${url} ${error.status || 500} - ${duration}ms - ${error.message}`);
        },
      }),
    );
  }
}