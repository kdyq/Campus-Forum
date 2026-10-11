import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as interactService from '../services/interact.service.ts';

const likeSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT']),
  targetId: z.coerce.number().int().positive(),
});

const bookmarkSchema = z.object({
  postId: z.coerce.number().int().positive(),
  folderId: z.coerce.number().int().positive().nullable().optional(),
});

const folderSchema = z.object({ name: z.string().trim().min(1, '请输入收藏夹名称').max(30) });

export async function likeHandler(req: Request, res: Response) {
  const { targetType, targetId } = likeSchema.parse(req.body);
  const result = await interactService.likeTarget(req.user!, targetType, targetId);
  ok(res, result);
}

export async function unlikeHandler(req: Request, res: Response) {
  const targetType = (req.params.targetType === 'COMMENT' ? 'COMMENT' : 'POST') as 'POST' | 'COMMENT';
  const targetId = Number(req.params.targetId);
  const result = await interactService.unlikeTarget(req.user!, targetType, targetId);
  ok(res, result);
}

export async function bookmarkHandler(req: Request, res: Response) {
  const { postId, folderId } = bookmarkSchema.parse(req.body);
  const result = await interactService.bookmarkPost(req.user!, postId, folderId ?? null);
  ok(res, result);
}

export async function unbookmarkHandler(req: Request, res: Response) {
  const postId = Number(req.params.postId);
  const result = await interactService.unbookmarkPost(req.user!, postId);
  ok(res, result);
}

export async function listBookmarksHandler(req: Request, res: Response) {
  ok(res, await interactService.listMyBookmarks(req.user!));
}

export async function createFolderHandler(req: Request, res: Response) {
  const { name } = folderSchema.parse(req.body);
  ok(res, await interactService.createFolder(req.user!, name));
}
