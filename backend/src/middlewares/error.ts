import { ZodError } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { AppError, CODES } from '../constants/codes.ts';
import { fail } from '../utils/http.ts';
import { logger } from '../utils/logger.ts';

export function notFoundHandler(_req: Request, res: Response): void {
  fail(res, CODES.NOT_FOUND, '接口不存在');
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    fail(res, err.code, err.message, err.httpStatus);
    return;
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    fail(res, CODES.PARAM, first?.message ?? '参数错误');
    return;
  }
  if (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'MulterError') {
    const code = (err as { code?: string }).code;
    if (code === 'LIMIT_FILE_SIZE') {
      fail(res, CODES.FILE_TOO_LARGE, '文件超出大小限制');
      return;
    }
    fail(res, CODES.FILE_TYPE, '文件上传失败');
    return;
  }
  logger.error('未处理异常:', err);
  fail(res, CODES.SERVER, '服务异常，请稍后重试');
}
