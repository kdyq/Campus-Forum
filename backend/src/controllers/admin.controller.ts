import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as adminService from '../services/admin.service.ts';
import * as sensitiveService from '../services/sensitive.service.ts';

function clientIp(req: Request): string {
  return req.ip ?? 'unknown';
}

export async function statsHandler(req: Request, res: Response) {
  ok(res, await adminService.dashboardStats());
}

export async function listUsersHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await adminService.listUsers({ q: q.q || undefined, page: Math.max(Number(q.page ?? 1), 1), pageSize: 20 }));
}

const updateUserSchema = z.object({
  status: z.enum(['ACTIVE', 'MUTED', 'BANNED']).optional(),
  mutedUntil: z.string().datetime({ offset: true }).nullable().optional(),
  role: z.enum(['SUPER_ADMIN', 'MODERATOR', 'USER']).optional(),
});

export async function updateUserHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const body = updateUserSchema.parse(req.body);
  ok(
    res,
    await adminService.updateUser(
      req.user!,
      id,
      {
        status: body.status,
        mutedUntil: body.mutedUntil !== undefined ? (body.mutedUntil === null ? null : new Date(body.mutedUntil)) : undefined,
        role: body.role,
      },
      clientIp(req),
    ),
  );
}

export async function listPostsHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await adminService.listAdminPosts({ status: q.status || undefined, q: q.q || undefined, page: Math.max(Number(q.page ?? 1), 1), pageSize: 20 }));
}

const postActionSchema = z.object({ action: z.enum(['PIN', 'UNPIN', 'FEATURE', 'UNFEATURE', 'LOCK', 'UNLOCK', 'REMOVE', 'RESTORE', 'APPROVE']) });

export async function postActionHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { action } = postActionSchema.parse(req.body);
  ok(res, await adminService.postAction(req.user!, id, action, clientIp(req)));
}

export async function auditLogsHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await adminService.listAuditLogs({ page: Math.max(Number(q.page ?? 1), 1), pageSize: 30 }));
}

export async function updateBoardHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const body = z
    .object({
      name: z.string().trim().min(1).max(20).optional(),
      description: z.string().trim().max(120).optional(),
      order: z.number().int().optional(),
      status: z.enum(['ACTIVE', 'HIDDEN']).optional(),
    })
    .parse(req.body);
  ok(res, await adminService.updateBoard(req.user!, id, body, clientIp(req)));
}

export async function createTagHandler(req: Request, res: Response) {
  const body = z.object({ name: z.string().trim().min(1, '请输入标签名').max(20), isOfficial: z.boolean().default(false) }).parse(req.body);
  ok(res, await adminService.createTag(req.user!, body.name, body.isOfficial, clientIp(req)));
}

// ---- 敏感词 ----
export async function listWordsHandler(_req: Request, res: Response) {
  ok(res, await sensitiveService.listWords());
}

export async function addWordHandler(req: Request, res: Response) {
  const body = z.object({ word: z.string().trim().min(1, '请输入敏感词').max(50), level: z.enum(['BLOCK', 'REVIEW']) }).parse(req.body);
  ok(res, await sensitiveService.addWord(body.word, body.level));
}

export async function removeWordHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  ok(res, await sensitiveService.removeWord(id));
}
