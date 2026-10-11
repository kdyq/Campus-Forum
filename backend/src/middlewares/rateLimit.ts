import type { NextFunction, Request, Response } from 'express';
import { AppError, CODES } from '../constants/codes.ts';
import { hitLimit } from '../utils/limiter.ts';

export function rateLimit(
  name: string,
  windowSec: number,
  max: number,
  keyOf: (req: Request) => string = (req) => req.ip ?? 'unknown',
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const { allowed, retryAfterSec } = await hitLimit(`${name}:${keyOf(req)}`, windowSec, max);
    if (!allowed) {
      return next(new AppError(CODES.TOO_MANY, `操作过于频繁，请 ${retryAfterSec} 秒后再试`));
    }
    next();
  };
}
