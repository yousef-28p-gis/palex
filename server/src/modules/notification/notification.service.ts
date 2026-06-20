import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/services/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  async sendNotification(userId: string, data: { title: string; message: string; type: string; data?: any }) {
    const notification = await this.prisma.notification.create({
      data: { 
        userId, 
        title: data.title, 
        message: data.message, 
        type: data.type, 
        metadata: data.data || {} 
      },
    });

    this.notificationGateway.sendNotification(userId, { 
      title: data.title, 
      message: data.message, 
      type: data.type, 
      data: data.data 
    });

    return notification;
  }
}