import Redis from 'ioredis';
import { env } from '../config/env.ts';
import { logger } from './logger.ts';

export const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  retryStrategy: (times) => (times > 3 ? null : Math.min(times * 500, 2000)),
});

redis.on('error', (err) => logger.warn('Redis:', err.message));

let connecting: Promise<boolean> | null = null;

/** 启动时尝试连接一次；失败不阻断启动，相关接口会给出明确错误 */
export function ensureRedis(): Promise<boolean> {
  connecting ??= redis
    .connect()
    .then(() => true)
    .catch((err: Error) => {
      logger.warn('Redis 连接失败（验证码与限流将不可用）:', err.message);
      return false;
    });
  return connecting;
}
