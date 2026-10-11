import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as courseService from '../services/course.service.ts';

export async function listHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await courseService.listCourses(q.q || undefined));
}

export async function detailHandler(req: Request, res: Response) {
  const code = String(req.params.code ?? '');
  ok(res, await courseService.getCourseByCode(code, req.user ?? null));
}

const reviewSchema = z.object({
  rating: z.coerce.number().min(1).max(5),
  workload: z.coerce.number().min(1).max(5),
  attendance: z.coerce.number().min(1).max(5),
  recommend: z.coerce.number().min(1).max(5),
  content: z.string().trim().max(2000).optional(),
  isAnonymous: z.boolean().default(false),
});

export async function submitReviewHandler(req: Request, res: Response) {
  const courseId = Number(req.params.id);
  const body = reviewSchema.parse(req.body);
  ok(res, await courseService.submitReview(req.user!, courseId, body));
}
