// JWT 签发与校验：access（2h，内存持有）+ refresh（14d，httpOnly Cookie + Redis 白名单）
import { SignJWT, jwtVerify } from 'jose';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.ts';

const accessKey = new TextEncoder().encode(env.jwtAccessSecret);
const refreshKey = new TextEncoder().encode(env.jwtRefreshSecret);

export async function signAccessToken(userId: number, role: string): Promise<string> {
  return new SignJWT({ type: 'access', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(env.accessTokenTtl)
    .sign(accessKey);
}

export async function signRefreshToken(userId: number): Promise<{ token: string; jti: string }> {
  const jti = randomUUID();
  const token = await new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${env.refreshTokenTtlDays}d`)
    .sign(refreshKey);
  return { token, jti };
}

export interface AccessClaims {
  sub: string;
  role?: string;
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey, { algorithms: ['HS256'] });
  if (payload.type !== 'access') throw new Error('wrong token type');
  return { sub: String(payload.sub), role: payload.role as string | undefined };
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; jti: string }> {
  const { payload } = await jwtVerify(token, refreshKey, { algorithms: ['HS256'] });
  if (payload.type !== 'refresh' || !payload.jti) throw new Error('wrong token type');
  return { sub: String(payload.sub), jti: String(payload.jti) };
}
