import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as draftService from '../services/draft.service.ts';

export async function getHandler(req: Request, res: Response) {
  ok(res, await draftService.getDraft(req.user!.id));
}

export async function saveHandler(req: Request, res: Response) {
  const body = (req.body ?? {}) as { boardId?: number | null; title?: string | null; content?: string | null };
  ok(res, await draftService.saveDraft(req.user!.id, body));
}

export async function clearHandler(req: Request, res: Response) {
  await draftService.clearDraft(req.user!.id);
  ok(res, { cleared: true });
}
