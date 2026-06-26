import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

// userId → Set<socketId> mapping (bitta foydalanuvchi bir nechta tabdan kirishi mumkin)
export const userSockets = new Map<string, Set<string>>();

export const setupSocket = (io: Server): void => {
  // Auth middleware
  io.use((socket: any, next: any) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Autentifikatsiya talab qilinadi'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch (error) {
      next(new Error('Token yaroqsiz'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId: string = socket.userId;
    console.log(`🔌 Socket ulandi: ${socket.id} | User: ${userId}`);

    // Foydalanuvchini o'z xonasiga qo'shish (userId asosida)
    socket.join(`user:${userId}`);

    // userSockets map'ini yangilash
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Xona statusini yangilash
    socket.on('room:requestStatus', async (data: any) => {
      io.emit('room:statusRequest', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 Socket uzildi: ${socket.id} | User: ${userId}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });
};
