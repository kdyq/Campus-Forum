import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import { REPORT_REASONS, createReport, handleReport, listReports } from '../services/report.service.ts';

const createSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER']),
  targetId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(1, '请选择举报原因'),
  detail: z.string().trim().max(500).optional(),
});

const handleSchema = z.object({
  action: z.enum(['ACCEPTED', 'REJECTED']),
  handleNote: z.string().trim().max(300).optional(),
});

export async function createHandler(req: Request, res: Response) {
  const body = createSchema.parse(req.body);
  if (!REPORT_REASONS.includes(body.reason as never) && body.reason !== '其他') {
    // 原因允许自定义扩展，但不为空即可
  }
  ok(res, await createReport(req.user!, body));
}

export async function listHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await listReports({ status: q.status || undefined, page: Math.max(Number(q.page ?? 1), 1), pageSize: 20 }));
}

export async function handleHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  const body = handleSchema.parse(req.body);
  ok(res, await handleReport(req.user!, id, body));
}

export function reasonsHandler(_req: Request, res: Response) {
  ok(res, REPORT_REASONS);
}
