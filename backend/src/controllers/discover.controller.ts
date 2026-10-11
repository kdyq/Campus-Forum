import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as searchService from '../services/search.service.ts';
import * as hotService from '../services/hot.service.ts';

export async function searchHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const result = await searchService.searchPosts({
    keyword: q.q ?? '',
    boardSlug: q.board || undefined,
    tagSlug: q.tag || undefined,
    page: Math.max(Number(q.page ?? 1), 1),
    pageSize: Math.min(Math.max(Number(q.limit ?? 20), 1), 50),
  });
  ok(res, result);
}

export async function hotHandler(_req: Request, res: Response) {
  ok(res, await hotService.getHotPosts(10));
}
