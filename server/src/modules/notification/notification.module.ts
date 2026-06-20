import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from '../../shared/services/prisma.service';

@Module({
  providers: [NotificationGateway, PrismaService],
  exports: [NotificationGateway],
})
export class NotificationModule {}