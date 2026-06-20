import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, string[]> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.auth.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId) || [];
      sockets.push(client.id);
      this.userSockets.set(userId, sockets);
      client.join(`user:${userId}`);
      this.logger.log(`User ${userId} connected to notifications`);
    }
  }

  handleDisconnect(client: Socket) {
    for (const [userId, sockets] of this.userSockets.entries()) {
      const index = sockets.indexOf(client.id);
      if (index !== -1) {
        sockets.splice(index, 1);
        if (sockets.length === 0) this.userSockets.delete(userId);
        else this.userSockets.set(userId, sockets);
        break;
      }
    }
  }

  sendNotification(userId: string, data: { title: string; message: string; type: string; data?: any }) {
    this.server.to(`user:${userId}`).emit('notification', { ...data, timestamp: new Date() });
  }
}