// 浏览计数：Redis 去重（同访客 48h 一次）+ 缓冲批量落库，不做实时写
import { redis } from './redis.ts';
import { prisma } from './prisma.ts';
import { logger } from './logger.ts';

export async function recordView(postId: number, viewerHash: string): Promise<void> {
  try {
    const key = `view:${postId}:${viewerHash}`;
    const added = await redis.set(key, '1', 'EX', 48 * 3600, 'NX');
    if (added === 'OK' || added === 1) {
      await redis.hincrby('viewbuf', String(postId), 1);
      await redis.expire('viewbuf', 7 * 86400);
    }
  } catch {
    // Redis 不可用时放弃本次计数
  }
}

export async function flushViewBuffer(): Promise<void> {
  try {
    const entries = await redis.hgetall('viewbuf');
    const ids = Object.keys(entries);
    if (ids.length === 0) return;
    await redis.del('viewbuf');
    await prisma.$transaction(
      ids.map((id) => prisma.post.update({ where: { id: Number(id) }, data: { viewCount: { increment: Number(entries[id]) } } })),
    );
  } catch (err) {
    logger.warn('浏览计数落库失败:', err);
  }
}
