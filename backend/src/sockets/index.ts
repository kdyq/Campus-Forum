// Socket.IO 网关：JWT 握手鉴权 + 按用户房间推送实时通知
import { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.ts';
import { verifyAccessToken } from '../utils/token.ts';
import { logger } from '../utils/logger.ts';

let io: Server | null = null;

export function initSockets(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('unauthorized'));
      const claims = await verifyAccessToken(token);
      socket.data.userId = Number(claims.sub);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as number;
    socket.join(`user:${userId}`);
    logger.info(`Socket 已连接: user ${userId}`);
    socket.on('disconnect', () => {
      logger.info(`Socket 已断开: user ${userId}`);
    });
  });

  return io;
}

export function getIo(): Server | null {
  return io;
}
