// 邮箱验证码：签发（限流 + 落 Redis + 发邮件）与核销
import { randomInt } from 'node:crypto';
import { env } from '../config/env.ts';
import { AppError, CODES } from '../constants/codes.ts';
import { hitLimit } from '../utils/limiter.ts';
import { redis } from '../utils/redis.ts';
import { sendVerificationCode } from '../utils/mail.ts';
import { prisma } from '../utils/prisma.ts';
import { logger } from '../utils/logger.ts';

export type CodeScene = 'REGISTER' | 'RESET';

export const CODE_TTL_SEC = 600;

export async function sendEmailCode(scene: CodeScene, email: string, ip: string): Promise<void> {
  const perMinute = await hitLimit(`vc1m:${scene}:${email}`, 60, 1);
  if (!perMinute.allowed) throw new AppError(CODES.TOO_MANY, '验证码发送过于频繁，请 1 分钟后再试');
  const perHour = await hitLimit(`vc1h:${scene}:${email}`, 3600, 3);
  if (!perHour.allowed) {
    throw new AppError(CODES.TOO_MANY, `该邮箱验证码发送次数已达上限，请 ${perHour.retryAfterSec} 秒后再试`);
  }
  const perIp = await hitLimit(`vcip:${ip}`, 3600, 10);
  if (!perIp.allowed) throw new AppError(CODES.TOO_MANY, `操作过于频繁，请 ${perIp.retryAfterSec} 秒后再试`);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (scene === 'REGISTER' && existing) throw new AppError(CODES.USERNAME_TAKEN, '该邮箱已注册，请直接登录');
  if (scene === 'RESET' && !existing) throw new AppError(CODES.NOT_FOUND, '该邮箱尚未注册');

  const code = String(randomInt(100000, 1000000));
  await redis.set(`vcode:${scene}:${email}`, code, 'EX', CODE_TTL_SEC);
  if (env.testMode) {
    // 测试模式：不实发邮件（保护邮箱服务额度），验证码仅在 Redis 中供测试读取
    logger.info(`[TEST_MODE] ${scene} 验证码未实发 → ${email} code=${code}`);
    return;
  }
  try {
    await sendVerificationCode(email, code, scene);
  } catch (err) {
    logger.error('验证码邮件发送失败:', err);
    throw new AppError(CODES.SERVER, '验证码邮件发送失败，请稍后重试');
  }
}

export async function consumeEmailCode(scene: CodeScene, email: string, code: string): Promise<void> {
  const key = `vcode:${scene}:${email}`;
  const saved = await redis.get(key);
  if (!saved || saved !== code) throw new AppError(CODES.CODE_INVALID, '验证码错误或已过期');
  await redis.del(key);
}
