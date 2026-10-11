// 环境变量集中读取与校验（启动时一次性完成）
import path from 'node:path';

try {
  process.loadEnvFile();
} catch {
  // .env 不存在时依赖真实环境变量（如 CI）
}

function required(name: string, minLength = 1): string {
  const value = process.env[name];
  if (!value || value.length < minLength) {
    throw new Error(`环境变量 ${name} 未设置或长度不足 ${minLength}`);
  }
  return value;
}

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error(`环境变量 ${name} 不是合法数字`);
  return parsed;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: num('PORT', 3000),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET', 32),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 32),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? '2h',
  refreshTokenTtlDays: num('REFRESH_TOKEN_TTL_DAYS', 14),
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  smtp: {
    host: required('SMTP_HOST'),
    port: num('SMTP_PORT', 465),
    user: required('SMTP_USER'),
    pass: required('SMTP_PASS'),
  },
  mailFrom: process.env.MAIL_FROM ?? '同窗 <no-reply@example.com>',
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS ?? '.edu.cn')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),
  // 上传文件落盘目录：backend/uploads
  uploadDir: path.resolve(import.meta.dirname, '../../uploads'),
} as const;
