import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as profileService from '../services/profile.service.ts';
import * as interactService from '../services/interact.service.ts';

export async function profileHandler(req: Request, res: Response) {
  const username = String(req.params.username ?? '');
  ok(res, await profileService.getProfile(username, req.user ?? null));
}

export async function userPostsHandler(req: Request, res: Response) {
  const username = String(req.params.username ?? '');
  const q = req.query as Record<string, string | undefined>;
  ok(res, await profileService.listUserPosts(username, Math.max(Number(q.page ?? 1), 1), 20, req.user ?? null));
}

export async function userCommentsHandler(req: Request, res: Response) {
  const username = String(req.params.username ?? '');
  const q = req.query as Record<string, string | undefined>;
  ok(res, await profileService.listUserComments(username, Math.max(Number(q.page ?? 1), 1), 20));
}

export async function userLikesHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await profileService.listUserLikedPosts(req.user!.id, Math.max(Number(q.page ?? 1), 1), 20));
}

export async function myBookmarksHandler(req: Request, res: Response) {
  ok(res, await interactService.listMyBookmarks(req.user!));
}
