import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { AppError, CODES } from '../constants/codes.ts';
import { checkDisplayName } from '../constants/validators.ts';
import { ok } from '../utils/http.ts';
import { prisma } from '../utils/prisma.ts';
import { env } from '../config/env.ts';
import { safeUserSelect } from '../types/safe-user.ts';

const updateMeSchema = z.object({
  displayName: z.string().trim().max(20).optional(),
  college: z.string().trim().max(50).optional(),
  grade: z.string().trim().max(20).optional(),
  major: z.string().trim().max(50).optional(),
  bio: z.string().trim().max(200).optional(),
});

export async function updateMeHandler(req: Request, res: Response) {
  const body = updateMeSchema.parse(req.body);
  if (body.displayName !== undefined) checkDisplayName(body.displayName);
  const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
  if (Object.keys(data).length === 0) throw new AppError(CODES.PARAM, '没有需要更新的字段');
  const user = await prisma.user.update({ where: { id: req.user!.id }, data, select: safeUserSelect });
  ok(res, user);
}

export async function uploadAvatarHandler(req: Request, res: Response) {
  const file = req.file;
  if (!file) throw new AppError(CODES.PARAM, '请选择头像图片文件');
  const avatarUrl = `/uploads/avatars/${file.filename}`;
  const prev = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { avatarUrl: true } });
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: { avatarUrl },
    select: safeUserSelect,
  });
  // 删除旧头像文件（basename 防路径穿越，仅限 avatars 目录）
  const prevUrl = prev?.avatarUrl;
  if (prevUrl?.startsWith('/uploads/avatars/')) {
    const oldPath = path.join(env.uploadDir, 'avatars', path.basename(prevUrl));
    await unlink(oldPath).catch(() => {});
  }
  ok(res, user);
}
