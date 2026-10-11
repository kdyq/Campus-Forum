import { z } from 'zod';
import type { Request, Response } from 'express';
import { createHash } from 'node:crypto';
import { ok } from '../utils/http.ts';
import { recordView } from '../utils/view.ts';
import * as postService from '../services/post.service.ts';

const createSchema = z.object({
  boardId: z.coerce.number().int().positive('请选择板块'),
  title: z.string().trim().min(1, '请输入标题'),
  content: z.string(),
  isAnonymous: z.boolean().default(false),
  tagIds: z.array(z.coerce.number().int().positive()).max(5).default([]),
  courseId: z.coerce.number().int().positive().nullable().optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  content: z.string().optional(),
  isAnonymous: z.boolean().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).max(5).optional(),
  courseId: z.coerce.number().int().positive().nullable().optional(),
});

const SORTS = ['latest', 'hot', 'featured'] as const;
type Sort = (typeof SORTS)[number];

function parseSort(v: unknown): Sort {
  return SORTS.includes(v as Sort) ? (v as Sort) : 'latest';
}

export async function listHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const result = await postService.listFeed({
    boardSlug: q.board || undefined,
    tagSlug: q.tag || undefined,
    courseId: q.courseId ? Number(q.courseId) : undefined,
    authorId: q.author ? Number(q.author) : undefined,
    sort: parseSort(q.sort),
    cursor: q.cursor || undefined,
    page: q.page ? Number(q.page) : undefined,
    pageSize: q.limit ? Number(q.limit) : undefined,
    viewer: req.user ?? null,
  });
  ok(res, result);
}

export async function detailHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const detail = await postService.getPostDetail(id, req.user ?? null);
  // 浏览计数：去重后异步累加
  const hash = req.user ? `u${req.user.id}` : createHash('sha256').update(req.ip ?? 'anon').digest('hex').slice(0, 24);
  void recordView(id, hash);
  ok(res, detail);
}

export async function createHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  const result = await postService.createPost(req.user!, {
    boardId: body.boardId,
    title: body.title,
    content: body.content,
    isAnonymous: body.isAnonymous,
    tagIds: body.tagIds,
    courseId: body.courseId ?? null,
  });
  ok(res, result);
}

export async function updateHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const body = updateSchema.parse(req.body);
  const result = await postService.updatePost(id, req.user!, body);
  ok(res, result);
}

export async function deleteHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const result = await postService.deletePost(id, req.user!);
  ok(res, result);
}

const acceptSchema = z.object({ commentId: z.coerce.number().int().positive() });

export async function acceptHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { commentId } = acceptSchema.parse(req.body);
  const result = await postService.acceptComment(id, commentId, req.user!);
  ok(res, result);
}
