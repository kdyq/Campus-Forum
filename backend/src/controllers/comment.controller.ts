import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as commentService from '../services/comment.service.ts';

const createSchema = z.object({
  content: z.string().min(1, '请输入评论内容'),
  isAnonymous: z.boolean().default(false),
  parentId: z.coerce.number().int().positive().nullable().optional(),
  replyToUserId: z.coerce.number().int().positive().nullable().optional(),
});

export async function listHandler(req: Request, res: Response) {
  const postId = Number(req.params.id);
  const tree = await commentService.listComments(postId, req.user ?? null);
  ok(res, tree);
}

export async function createHandler(req: Request, res: Response) {
  const postId = Number(req.params.id);
  const body = createSchema.parse(req.body);
  const result = await commentService.createComment(postId, req.user!, {
    content: body.content,
    isAnonymous: body.isAnonymous,
    parentId: body.parentId ?? null,
    replyToUserId: body.replyToUserId ?? null,
  });
  ok(res, result);
}

export async function deleteHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  await commentService.deleteComment(id, req.user!);
  ok(res, { deleted: true });
}
