// 社交域控制器：通知、关注、投票
import { z } from 'zod';
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import * as notificationService from '../services/notification.service.ts';
import * as followService from '../services/follow.service.ts';
import * as pollService from '../services/poll.service.ts';

const NOTIFICATION_TYPES = ['REPLY', 'SUB_REPLY', 'MENTION', 'LIKE', 'BOOKMARK', 'ACCEPTED', 'SYSTEM', 'MODERATION', 'FOLLOW'] as const;

export async function notificationListHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  const type = q.type && (NOTIFICATION_TYPES as readonly string[]).includes(q.type) ? q.type : undefined;
  ok(
    res,
    await notificationService.listNotifications(req.user!.id, {
      type,
      unreadOnly: q.unread === '1',
      page: Math.max(Number(q.page ?? 1), 1),
      pageSize: 20,
    }),
  );
}

export async function unreadCountHandler(req: Request, res: Response) {
  ok(res, { count: await notificationService.unreadCount(req.user!.id) });
}

const markReadSchema = z.object({ ids: z.array(z.coerce.number().int().positive()).optional(), all: z.boolean().optional() });

export async function markReadHandler(req: Request, res: Response) {
  const body = markReadSchema.parse(req.body ?? {});
  await notificationService.markRead(req.user!.id, body.all ? undefined : body.ids);
  ok(res, { count: await notificationService.unreadCount(req.user!.id) });
}

const followSchema = z.object({ targetType: z.enum(['USER', 'TAG', 'COURSE']), targetId: z.coerce.number().int().positive() });

export async function followHandler(req: Request, res: Response) {
  const { targetType, targetId } = followSchema.parse(req.body);
  ok(res, await followService.follow(req.user!, targetType, targetId));
}

export async function unfollowHandler(req: Request, res: Response) {
  const targetType = req.params.targetType as 'USER' | 'TAG' | 'COURSE';
  if (!['USER', 'TAG', 'COURSE'].includes(targetType)) {
    res.status(200).json({ code: 10001, message: '参数错误', data: null });
    return;
  }
  ok(res, await followService.unfollow(req.user!, targetType, Number(req.params.targetId)));
}

export async function followingStateHandler(req: Request, res: Response) {
  const targetType = req.params.targetType as 'USER' | 'TAG' | 'COURSE';
  ok(res, { following: await followService.isFollowing(req.user!.id, targetType, Number(req.params.targetId)) });
}

export async function myFollowsHandler(req: Request, res: Response) {
  ok(res, await followService.listMyFollows(req.user!));
}

export async function followingFeedHandler(req: Request, res: Response) {
  const q = req.query as Record<string, string | undefined>;
  ok(res, await followService.followingFeed(req.user!, q.cursor || undefined, Math.min(Number(q.limit ?? 20), 50)));
}

// ---- 投票 ----
const createPollSchema = z.object({
  question: z.string().trim().min(1, '请输入投票问题').max(120),
  options: z.array(z.string().trim().min(1)).min(2, '至少两个选项').max(6),
  multiple: z.boolean().default(false),
  closesInDays: z.number().int().min(1).max(30).optional(),
});

export async function createPollHandler(req: Request, res: Response) {
  const postId = Number(req.params.id);
  const body = createPollSchema.parse(req.body);
  ok(res, await pollService.createPoll(req.user!, postId, body));
}

const voteSchema = z.object({ choices: z.array(z.coerce.number().int().positive()).min(1, '请至少选择一个选项') });

export async function voteHandler(req: Request, res: Response) {
  const pollId = Number(req.params.pollId);
  const { choices } = voteSchema.parse(req.body);
  ok(res, await pollService.votePoll(req.user!, pollId, choices));
}

export async function getPollHandler(req: Request, res: Response) {
  const postId = Number(req.params.id);
  ok(res, await pollService.getPollForPost(postId, req.user ?? null));
}
