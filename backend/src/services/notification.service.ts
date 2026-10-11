// 站内通知：先落库（第 4 步接 Socket.IO 实时推送与通知中心）
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.ts';
import { logger } from '../utils/logger.ts';

export type NotificationType =
  | 'REPLY' // 帖子收到回复
  | 'SUB_REPLY' // 评论收到楼中楼回复
  | 'MENTION' // @提及
  | 'LIKE' // 收到点赞
  | 'BOOKMARK' // 收到收藏
  | 'ACCEPTED' // 回答被采纳
  | 'SYSTEM'
  | 'MODERATION'; // 举报处理回执等

export async function notify(
  recipientId: number,
  type: NotificationType,
  payload: Prisma.InputJsonValue,
  options: { dedupeKey?: string } = {},
): Promise<void> {
  try {
    await prisma.notification.create({ data: { recipientId, type, payload } });
  } catch (err) {
    logger.warn('通知写入失败:', err);
  }
}
