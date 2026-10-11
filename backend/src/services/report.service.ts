// 举报服务：防重复举报、禁止举报自己、处理结果回执举报人
import { AppError, CODES } from '../constants/codes.ts';
import { POST_STATUS } from '../constants/enums.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { notify } from './notification.service.ts';

export type ReportTargetType = 'POST' | 'COMMENT' | 'USER';
export const REPORT_REASONS = ['垃圾广告', '人身攻击', '违法违规', '色情低俗', '引战谩骂', '侵权', '其他'] as const;

async function assertTargetExists(targetType: ReportTargetType, targetId: number): Promise<{ authorId: number; label: string }> {
  if (targetType === 'POST') {
    const post = await prisma.post.findFirst({ where: { id: targetId, deletedAt: null }, select: { authorId: true, title: true } });
    if (!post) throw new AppError(CODES.NOT_FOUND, '被举报的帖子不存在');
    return { authorId: post.authorId, label: post.title };
  }
  if (targetType === 'COMMENT') {
    const c = await prisma.comment.findFirst({ where: { id: targetId, deletedAt: null }, select: { authorId: true, content: true } });
    if (!c) throw new AppError(CODES.NOT_FOUND, '被举报的评论不存在');
    return { authorId: c.authorId, label: c.content.slice(0, 30) };
  }
  const user = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, displayName: true } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '被举报的用户不存在');
  return { authorId: user.id, label: user.displayName };
}

export async function createReport(
  reporter: SafeUser,
  input: { targetType: ReportTargetType; targetId: number; reason: string; detail?: string },
) {
  const target = await assertTargetExists(input.targetType, input.targetId);
  if (target.authorId === reporter.id) throw new AppError(CODES.SELF_TARGET, '不能举报自己的内容');

  const duplicated = await prisma.report.findFirst({
    where: { reporterId: reporter.id, targetType: input.targetType, targetId: input.targetId, status: 'PENDING' },
    select: { id: true },
  });
  if (duplicated) throw new AppError(CODES.DUPLICATE_REPORT, '你已举报过该内容，请等待处理结果');

  const report = await prisma.report.create({
    data: {
      reporterId: reporter.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason.slice(0, 30),
      detail: input.detail?.slice(0, 500),
    },
  });
  return { id: report.id };
}

export async function handleReport(
  handler: SafeUser,
  reportId: number,
  input: { action: 'ACCEPTED' | 'REJECTED'; handleNote?: string },
) {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) throw new AppError(CODES.NOT_FOUND, '举报记录不存在');
  if (report.status !== 'PENDING') throw new AppError(CODES.PARAM, '该举报已处理过');

  if (input.action === 'ACCEPTED') {
    if (report.targetType === 'POST') {
      await prisma.post.update({
        where: { id: report.targetId },
        data: { status: POST_STATUS.REMOVED, deletedAt: new Date() },
      }).catch(() => undefined);
    } else if (report.targetType === 'COMMENT') {
      await prisma.comment.update({
        where: { id: report.targetId },
        data: { status: 'REMOVED', deletedAt: new Date() },
      }).catch(() => undefined);
    } else {
      await prisma.user.update({ where: { id: report.targetId }, data: { status: 'BANNED' } }).catch(() => undefined);
    }
  }

  const updated = await prisma.report.update({
    where: { id: report.id },
    data: {
      status: input.action,
      handledById: handler.id,
      handledAt: new Date(),
      handleNote: input.handleNote?.slice(0, 300),
    },
  });

  // 回执举报人
  await notify(report.reporterId, 'MODERATION', {
    reportId: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    result: input.action,
    note: input.handleNote ?? null,
  });
  return { id: updated.id, status: updated.status };
}

export async function listReports(params: { status?: string; page: number; pageSize: number }) {
  const where = params.status ? { status: params.status } : {};
  const [total, reports] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }], // PENDING 优先
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { reporter: { select: { id: true, displayName: true, username: true } }, handler: { select: { displayName: true } } },
    }),
  ]);

  // 批量解析举报目标摘要
  const postIds = reports.filter((r) => r.targetType === 'POST').map((r) => r.targetId);
  const commentIds = reports.filter((r) => r.targetType === 'COMMENT').map((r) => r.targetId);
  const userIds = reports.filter((r) => r.targetType === 'USER').map((r) => r.targetId);
  const [posts, comments, users] = await Promise.all([
    postIds.length ? prisma.post.findMany({ where: { id: { in: postIds } }, select: { id: true, title: true, status: true, deletedAt: true } }) : [],
    commentIds.length ? prisma.comment.findMany({ where: { id: { in: commentIds } }, select: { id: true, content: true, status: true, deletedAt: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, displayName: true, username: true, status: true } }) : [],
  ]);
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    total,
    items: reports.map((r) => {
      let target: { label: string; status: string | null; deleted: boolean } | null = null;
      if (r.targetType === 'POST') {
        const p = postMap.get(r.targetId);
        target = p ? { label: p.title, status: p.status, deleted: p.deletedAt !== null } : { label: '（已删除）', status: null, deleted: true };
      } else if (r.targetType === 'COMMENT') {
        const c = commentMap.get(r.targetId);
        target = c ? { label: c.content.slice(0, 60), status: c.status, deleted: c.deletedAt !== null } : { label: '（已删除）', status: null, deleted: true };
      } else {
        const u = userMap.get(r.targetId);
        target = u ? { label: `${u.displayName}（@${u.username}）`, status: u.status, deleted: false } : { label: '（用户不存在）', status: null, deleted: true };
      }
      return { ...r, target };
    }),
  };
}
