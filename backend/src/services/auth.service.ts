// 账号服务：注册（教育邮箱白名单 + 邀请码）、登录（失败锁定）、会话签发与轮换
import bcrypt from 'bcryptjs';
import { AppError, CODES } from '../constants/codes.ts';
import { checkDisplayName, checkPassword, checkUsername, isEmailDomainAllowed } from '../constants/validators.ts';
import { env } from '../config/env.ts';
import { pickSafeUser, type SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { redis } from '../utils/redis.ts';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.ts';
import { hitLimit } from '../utils/limiter.ts';
import { logger } from '../utils/logger.ts';
import { consumeEmailCode, sendEmailCode } from './email-code.service.ts';

const BCRYPT_COST = 10;
const LOGIN_FAIL_MAX = 5;
const LOGIN_FAIL_TTL_SEC = 900; // 15 分钟

export interface Session {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

async function issueSession(user: SafeUser): Promise<Session> {
  const accessToken = await signAccessToken(user.id, user.role);
  const { token: refreshToken, jti } = await signRefreshToken(user.id);
  await redis.set(`rt:${user.id}:${jti}`, '1', 'EX', env.refreshTokenTtlDays * 86400);
  return { user, accessToken, refreshToken };
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

export interface RegisterInput {
  username: string;
  displayName: string;
  email: string;
  password: string;
  inviteCode?: string;
}

export async function register(input: RegisterInput, ip: string): Promise<{ id: number; username: string; email: string; needsEmailVerification: true }> {
  checkUsername(input.username);
  checkPassword(input.password);
  checkDisplayName(input.displayName);
  const email = input.email.toLowerCase();

  const [usernameTaken, emailTaken] = await Promise.all([
    prisma.user.findUnique({ where: { username: input.username }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);
  if (usernameTaken) throw new AppError(CODES.USERNAME_TAKEN, '用户名已被占用');
  if (emailTaken) throw new AppError(CODES.USERNAME_TAKEN, '该邮箱已被注册');

  let invitedByCodeId: number | null = null;
  if (!isEmailDomainAllowed(email, env.allowedEmailDomains)) {
    if (!input.inviteCode) {
      throw new AppError(CODES.EMAIL_DOMAIN_NOT_ALLOWED, '请使用校园邮箱注册。如果还没有校园邮箱，可以使用邀请码');
    }
    const invite = await prisma.inviteCode.findUnique({ where: { code: input.inviteCode.toUpperCase() } });
    const usable =
      invite !== null && !invite.disabled && (!invite.expiresAt || invite.expiresAt > new Date()) && invite.usedCount < invite.maxUses;
    if (!usable) throw new AppError(CODES.INVITE_INVALID, '邀请码无效或已用尽');
    invitedByCodeId = invite.id;
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      if (invitedByCodeId !== null) {
        await tx.inviteCode.update({ where: { id: invitedByCodeId }, data: { usedCount: { increment: 1 } } });
      }
      return tx.user.create({
        data: { username: input.username, displayName: input.displayName, email, passwordHash, invitedByCodeId },
      });
    });
  } catch (err) {
    // 并发注册撞唯一键
    if (isUniqueViolation(err)) throw new AppError(CODES.USERNAME_TAKEN, '用户名或邮箱已被占用');
    throw err;
  }

  // 注册成功后即发送邮箱验证码；失败不影响注册结果，用户可在验证页重发
  sendEmailCode('REGISTER', email, ip).catch((err) => logger.warn('注册后验证码邮件发送失败:', err));

  return { id: user.id, username: user.username, email, needsEmailVerification: true };
}

export async function login(identifier: string, password: string, ip: string): Promise<Session> {
  const perIp = await hitLimit(`login:${ip}`, 600, 10); // 10 次 / 10 分钟 / IP
  if (!perIp.allowed) throw new AppError(CODES.TOO_MANY, `登录尝试过于频繁，请 ${perIp.retryAfterSec} 秒后再试`);

  const ident = identifier.trim();
  const failKey = `loginfail:${ident.toLowerCase()}`;
  const fails = Number((await redis.get(failKey)) ?? 0);
  if (fails >= LOGIN_FAIL_MAX) {
    const ttl = await redis.ttl(failKey);
    const minutes = Math.max(1, Math.ceil((ttl > 0 ? ttl : LOGIN_FAIL_TTL_SEC) / 60));
    throw new AppError(CODES.LOGIN_LOCKED, `登录失败次数过多，请约 ${minutes} 分钟后再试`);
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: ident }, { email: ident.toLowerCase() }] },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await redis.set(failKey, fails + 1, 'EX', LOGIN_FAIL_TTL_SEC);
    throw new AppError(CODES.BAD_CREDENTIALS, '账号或密码错误');
  }
  if (user.status === 'BANNED') {
    throw new AppError(CODES.ACCOUNT_BANNED, '账号已被封禁，如有疑问请联系管理员');
  }
  await redis.del(failKey);
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  return issueSession(pickSafeUser(user));
}

/** 用 refresh token 换新会话（旧 token 立即作废，实现轮换） */
export async function refresh(rawRefreshToken: string | undefined): Promise<Session> {
  if (!rawRefreshToken) throw new AppError(CODES.UNAUTHORIZED, '登录状态已过期', 401);
  let claims: { sub: string; jti: string };
  try {
    claims = await verifyRefreshToken(rawRefreshToken);
  } catch {
    throw new AppError(CODES.UNAUTHORIZED, '登录状态已过期', 401);
  }
  const key = `rt:${claims.sub}:${claims.jti}`;
  if (!(await redis.get(key))) throw new AppError(CODES.UNAUTHORIZED, '登录状态已过期', 401);
  const user = await prisma.user.findUnique({ where: { id: Number(claims.sub) } });
  if (!user) throw new AppError(CODES.UNAUTHORIZED, '登录状态已过期', 401);
  if (user.status === 'BANNED') throw new AppError(CODES.ACCOUNT_BANNED, '账号已被封禁', 403);
  await redis.del(key);
  return issueSession(pickSafeUser(user));
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) return;
  try {
    const claims = await verifyRefreshToken(rawRefreshToken);
    await redis.del(`rt:${claims.sub}:${claims.jti}`);
  } catch {
    // 无效令牌直接忽略，登出总是成功
  }
}

/** 邮箱验证成功后视为已认证，并直接登录 */
export async function verifyEmail(email: string, code: string): Promise<Session> {
  await consumeEmailCode('REGISTER', email, code);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '账号不存在');
  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    user.emailVerified = true;
  }
  return issueSession(pickSafeUser(user));
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
  checkPassword(password);
  await consumeEmailCode('RESET', email, code);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '账号不存在');
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  await revokeAllSessions(user.id); // 改密后吊销全部会话
}

export async function revokeAllSessions(userId: number): Promise<void> {
  let cursor = '0';
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `rt:${userId}:*`, 'COUNT', 100);
    cursor = next;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== '0');
}
