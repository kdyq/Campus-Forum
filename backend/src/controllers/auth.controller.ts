import { z } from 'zod';
import type { Request, Response } from 'express';
import { env } from '../config/env.ts';
import { ok } from '../utils/http.ts';
import { sendEmailCode } from '../services/email-code.service.ts';
import * as authService from '../services/auth.service.ts';

const emailField = z
  .string()
  .trim()
  .min(1, '请输入邮箱')
  .email('邮箱格式不正确')
  .max(120, '邮箱过长')
  .transform((v) => v.toLowerCase());
const codeField = z.string().trim().regex(/^\d{6}$/, '验证码为 6 位数字');

const sendCodeSchema = z.object({ email: emailField, scene: z.enum(['REGISTER', 'RESET']) });
const registerSchema = z.object({
  username: z.string().trim().max(20),
  displayName: z.string().trim().max(20),
  email: emailField,
  password: z.string(),
  inviteCode: z.string().trim().max(32).optional(),
});
const loginSchema = z.object({
  identifier: z.string().trim().min(1, '请输入用户名或邮箱').max(120),
  password: z.string().min(1, '请输入密码'),
});
const verifyEmailSchema = z.object({ email: emailField, code: codeField });
const resetSchema = z.object({ email: emailField, code: codeField, password: z.string() });

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  secure: env.nodeEnv === 'production',
};

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

export async function sendEmailCodeHandler(req: Request, res: Response) {
  const { email, scene } = sendCodeSchema.parse(req.body);
  await sendEmailCode(scene, email, clientIp(req));
  ok(res, { sent: true });
}

export async function registerHandler(req: Request, res: Response) {
  const body = registerSchema.parse(req.body);
  const result = await authService.register(body, clientIp(req));
  ok(res, result);
}

export async function loginHandler(req: Request, res: Response) {
  const { identifier, password } = loginSchema.parse(req.body);
  const session = await authService.login(identifier, password, clientIp(req));
  res.cookie('rt', session.refreshToken, COOKIE_OPTS);
  ok(res, { accessToken: session.accessToken, user: session.user });
}

export async function refreshHandler(req: Request, res: Response) {
  const session = await authService.refresh(req.cookies?.rt as string | undefined);
  res.cookie('rt', session.refreshToken, COOKIE_OPTS);
  ok(res, { accessToken: session.accessToken, user: session.user });
}

export async function logoutHandler(req: Request, res: Response) {
  await authService.logout(req.cookies?.rt as string | undefined);
  res.clearCookie('rt', { path: '/api/auth' });
  ok(res);
}

export async function verifyEmailHandler(req: Request, res: Response) {
  const { email, code } = verifyEmailSchema.parse(req.body);
  const session = await authService.verifyEmail(email, code);
  res.cookie('rt', session.refreshToken, COOKIE_OPTS);
  ok(res, { accessToken: session.accessToken, user: session.user });
}

export async function resetPasswordHandler(req: Request, res: Response) {
  const { email, code, password } = resetSchema.parse(req.body);
  await authService.resetPassword(email, code, password);
  ok(res, { reset: true });
}

export async function meHandler(req: Request, res: Response) {
  ok(res, req.user ?? null);
}
