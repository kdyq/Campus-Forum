// 站内通知：落库 + Socket.IO 实时推送（第 4 步）
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.ts';
import { getIo } from '../sockets/index.ts';
import { logger } from '../utils/logger.ts';

export type NotificationType =
  | 'REPLY'
  | 'SUB_REPLY'
  | 'MENTION'
  | 'LIKE'
  | 'BOOKMARK'
  | 'ACCEPTED'
  | 'SYSTEM'
  | 'MODERATION'
  | 'FOLLOW';

export async function notify(
  recipientId: number,
  type: NotificationType,
  payload: Prisma.InputJsonValue,
): Promise<void> {
  try {
    const created = await prisma.notification.create({ data: { recipientId, type, payload } });
    const io = getIo();
    io?.to(`user:${recipientId}`).emit('notification', {
      id: created.id,
      type,
      payload,
      createdAt: created.createdAt,
    });
  } catch (err) {
    logger.warn('通知写入失败:', err);
  }
}

export async function listNotifications(
  userId: number,
  params: { type?: string; unreadOnly?: boolean; page: number; pageSize: number },
) {
  const where = {
    recipientId: userId,
    ...(params.type ? { type: params.type } : {}),
    ...(params.unreadOnly ? { isRead: false } : {}),
  };
  const [total, unreadCount, items] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ]);
  return { total, unreadCount, items };
}

export async function unreadCount(userId: number): Promise<number> {
  return prisma.notification.count({ where: { recipientId: userId, isRead: false } });
}

export async function markRead(userId: number, ids?: number[]): Promise<void> {
  await prisma.notification.updateMany({
    where: { recipientId: userId, ...(ids && ids.length ? { id: { in: ids } } : {}) },
    data: { isRead: true },
  });
}
