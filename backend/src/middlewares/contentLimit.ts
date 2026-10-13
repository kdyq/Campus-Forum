// 内容频率限制（项目规范 §4.4）：按账号维度区分新账号沙箱期与普通用户
import type { NextFunction, Request, Response } from 'express';
import { AppError, CODES } from '../constants/codes.ts';
import { ROLES } from '../constants/enums.ts';
import { hitLimit } from '../utils/limiter.ts';

const NEW_ACCOUNT_MS = 24 * 3600 * 1000;

function isNewUser(req: Request): boolean {
  const createdAt = (req.user as unknown as { createdAt?: Date } | undefined)?.createdAt;
  return createdAt ? Date.now() - createdAt.getTime() < NEW_ACCOUNT_MS : true;
}

function limitFor(req: Request, normal: number, fresh: number): number {
  if (!req.user) return fresh;
  if (req.user.role === ROLES.SUPER_ADMIN || req.user.role === ROLES.MODERATOR) return Number.MAX_SAFE_INTEGER;
  return isNewUser(req) ? fresh : normal;
}

function actionLimit(action: string, normal: number, fresh: number, windowSec = 86400) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const max = limitFor(req, normal, fresh);
    if (max === Number.MAX_SAFE_INTEGER) return next();
    const { allowed, retryAfterSec } = await hitLimit(`act:${action}:${req.user!.id}`, windowSec, max);
    if (!allowed) {
      const hours = Math.ceil(retryAfterSec / 3600);
      return next(
        new AppError(CODES.TOO_MANY, `操作过于频繁，今日额度已用完${hours > 0 ? `，约 ${hours} 小时后恢复` : `，请 ${retryAfterSec} 秒后再试`}`),
      );
    }
    next();
  };
}

export const postLimit = () => actionLimit('post', 20, 3); // 新账号 3/天，普通 20/天
export const commentLimit = () => actionLimit('comment', 60, 10);
export const likeLimit = () => actionLimit('like', 300, 100);
export const bookmarkLimit = () => actionLimit('bookmark', 300, 100);
export const reportLimit = () => actionLimit('report', 20, 5);
export const imageUploadLimit = () => actionLimit('image', 50, 10);
