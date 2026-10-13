// 基于 Redis ZSET 的滑动窗口限流（项目规范 §4.4 的令牌桶思路的等价实现）
import { redis } from './redis.ts';

export interface LimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export async function hitLimit(key: string, windowSec: number, max: number): Promise<LimitResult> {
  const now = Date.now();
  const k = `rl:${key}`;
  try {
    const res = await redis
      .multi()
      .zremrangebyscore(k, '-inf', now - windowSec * 1000)
      .zadd(k, now, `${now}:${Math.random().toString(36).slice(2, 8)}`)
      .zcard(k)
      .pexpire(k, windowSec * 1000 + 1000)
      .exec();
    const count = Number(res?.[2]?.[1] ?? 0);
    if (count <= max) return { allowed: true, retryAfterSec: 0 };
    const oldest = await redis.zrange(k, 0, 0, 'WITHSCORES');
    const oldestAt = oldest.length >= 2 ? Number(oldest[1]) : now;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((oldestAt + windowSec * 1000 - now) / 1000)),
    };
  } catch {
    // Redis 不可用时放行（验证码等接口自身会因 Redis 缺失报错），避免整站不可用
    return { allowed: true, retryAfterSec: 0 };
  }
}
