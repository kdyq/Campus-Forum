import type { NextFunction, Request, Response } from 'express';
import { AppError, CODES } from '../constants/codes.ts';
import { prisma } from '../utils/prisma.ts';
import { safeUserSelect } from '../types/safe-user.ts';
import { verifyAccessToken } from '../utils/token.ts';

function bearerToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

/** 强制登录：解析 access token 并加载用户 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return next(new AppError(CODES.UNAUTHORIZED, '未登录', 401));
  try {
    const claims = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: Number(claims.sub) },
      select: safeUserSelect,
    });
    if (!user) return next(new AppError(CODES.UNAUTHORIZED, '登录已过期', 401));
    if (user.status === 'BANNED') {
      return next(new AppError(CODES.ACCOUNT_BANNED, '账号已被封禁，如有疑问请联系管理员', 403));
    }
    req.user = user;
    next();
  } catch {
    next(new AppError(CODES.UNAUTHORIZED, '登录已过期', 401));
  }
}

/** 可选登录：有合法 token 就挂上用户，匿名请求照常放行 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) return next();
  try {
    const claims = await verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: Number(claims.sub) },
      select: safeUserSelect,
    });
    if (user && user.status !== 'BANNED') req.user = user;
    next();
  } catch {
    next(); // 无效 token 按匿名处理
  }
}

/** 内容创作守卫：先鉴权，再要求邮箱已验证且未被禁言 */
export function requireVerified(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    const user = req.user!;
    if (!user.emailVerified) {
      return next(new AppError(CODES.FORBIDDEN, '请先完成邮箱验证再来发帖与评论', 403));
    }
    if (user.status === 'MUTED' && user.mutedUntil && user.mutedUntil > new Date()) {
      const until = user.mutedUntil.toLocaleString('zh-CN');
      return next(new AppError(CODES.FORBIDDEN, `账号已被禁言，至 ${until}`, 403));
    }
    next();
  });
}
