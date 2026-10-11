// 上传：头像（第 2 步将扩展出帖子图片上传，共用目录约定）
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import multer from 'multer';
import { env } from '../config/env.ts';
import { AppError, CODES } from '../constants/codes.ts';

export const AVATAR_MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const avatarDir = path.join(env.uploadDir, 'avatars');
mkdirSync(avatarDir, { recursive: true });

export const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${AVATAR_MIME_EXT[file.mimetype] ?? '.bin'}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // 头像 2MB
  fileFilter: (_req, file, cb) => {
    if (!AVATAR_MIME_EXT[file.mimetype]) {
      return cb(new AppError(CODES.FILE_TYPE, '头像仅支持 jpg / png / webp / gif 格式'));
    }
    cb(null, true);
  },
});
