// 评论服务：两级结构 + 楼中楼（第三级回复自动挂到顶级评论，用 replyToUser 显示「回复 @某人」）
import type { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import { POST_STATUS } from '../constants/enums.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { expDelta, EXP_GAIN } from '../utils/level.ts';
import { notify } from './notification.service.ts';
import { checkSensitive } from './sensitive.service.ts';

export const COMMENT_MAX = 2000;
const COMMENT_REVIEW_NOTICE = '评论已提交，将审核通过后展示';

const replyUserSelect = { id: true, username: true, displayName: true, avatarUrl: true } as const;

const includeForComment = {
  author: { select: { ...replyUserSelect, level: true, exp: true } },
  replyToUser: { select: replyUserSelect },
} satisfies Prisma.CommentInclude;

type CommentRow = Prisma.CommentGetPayload<{ include: typeof includeForComment }>;

export interface CommentNode {
  id: number;
  content: string;
  status: string;
  isAnonymous: boolean;
  likeCount: number;
  createdAt: Date;
  isTop: boolean;
  author: { id: number; username: string; displayName: string; avatarUrl: string | null; level: number; exp: number } | null;
  replyToUser: { id: number; displayName: string } | null;
  deleted: boolean;
  likeByViewer: boolean;
  replies: CommentNode[];
}

function toNode(row: CommentRow, likedSet: Set<number>): CommentNode {
  const deleted = row.deletedAt !== null;
  return {
    id: row.id,
    content: deleted ? '' : row.content,
    status: row.status,
    isAnonymous: row.isAnonymous,
    likeCount: row.likeCount,
    createdAt: row.createdAt,
    isTop: row.parentId === null,
    author: deleted || row.isAnonymous
      ? null
      : {
          id: row.author.id,
          username: row.author.username,
          displayName: row.author.displayName,
          avatarUrl: row.author.avatarUrl,
          level: row.author.level,
          exp: row.author.exp,
        },
    replyToUser: row.replyToUser ? { id: row.replyToUser.id, displayName: row.replyToUser.displayName } : null,
    deleted,
    likeByViewer: likedSet.has(row.id),
    replies: [],
  };
}

export async function listComments(postId: number, viewer?: SafeUser | null): Promise<CommentNode[]> {
  const rows = await prisma.comment.findMany({
    where: { postId, status: { not: 'REMOVED' } },
    include: includeForComment,
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  let likedSet = new Set<number>();
  if (viewer && rows.length > 0) {
    const likes = await prisma.like.findMany({
      where: { userId: viewer.id, targetType: 'COMMENT', targetId: { in: rows.map((r) => r.id) } },
      select: { targetId: true },
    });
    likedSet = new Set(likes.map((l) => l.targetId));
  }
  const nodes = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];
  for (const row of rows) nodes.set(row.id, toNode(row, likedSet));
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export interface CreateCommentInput {
  content: string;
  isAnonymous: boolean;
  parentId?: number | null;
  replyToUserId?: number | null;
}

export async function createComment(postId: number, author: SafeUser, input: CreateCommentInput) {
  const content = input.content.trim();
  if (!content) throw new AppError(CODES.PARAM, '评论内容不能为空');
  if (content.length > COMMENT_MAX) throw new AppError(CODES.CONTENT_TOO_LONG, `评论不能超过 ${COMMENT_MAX} 字`);
  const sensitive = await checkSensitive(content);
  if (sensitive === 'blocked') throw new AppError(CODES.SENSITIVE, '评论包含不允许发布的词汇');

  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);
  if (post.status === POST_STATUS.LOCKED) throw new AppError(CODES.POST_LOCKED, '帖子已锁定，不能再评论');

  // 两级约束：回复只能挂在顶级评论下；若父评论本身在楼中楼里，自动改挂其顶级评论
  let parentId: number | null = null;
  let replyToUserId = input.replyToUserId ?? null;
  let floorOwnerId: number | null = null;
  if (input.parentId) {
    const parent = await prisma.comment.findFirst({ where: { id: input.parentId, postId, deletedAt: null } });
    if (!parent) throw new AppError(CODES.NOT_FOUND, '回复的评论不存在');
    parentId = parent.parentId ?? parent.id;
    floorOwnerId = (parent.parentId ?? parent.id) === parent.id ? parent.authorId : null;
    if (parent.parentId && !replyToUserId) replyToUserId = parent.authorId; // 回复楼中楼里的某人
  }
  if (replyToUserId !== null) {
    const replyTo = await prisma.user.findUnique({ where: { id: replyToUserId }, select: { id: true } });
    if (!replyTo) throw new AppError(CODES.PARAM, '被回复的用户不存在');
  }

  const created = await prisma.$transaction(async (tx) => {
    const c = await tx.comment.create({
      data: {
        postId,
        authorId: author.id,
        parentId,
        replyToUserId,
        content,
        isAnonymous: input.isAnonymous,
        status: sensitive === 'review' ? 'PENDING' : 'NORMAL',
      },
    });
    await tx.post.update({
      where: { id: postId },
      data: { commentCount: { increment: 1 }, lastActivityAt: new Date() },
    });
    const gain = expDelta(author.exp, EXP_GAIN.COMMENT);
    await tx.user.update({ where: { id: author.id }, data: { exp: gain.exp, level: gain.level } });
    return c;
  });

  // 通知：顶级回复告知楼主；楼中楼回复告知楼主层的人与被回复者
  if (parentId === null) {
    if (post.authorId !== author.id) {
      await notify(post.authorId, 'REPLY', { postId, postTitle: post.title, commentId: created.id });
    }
  } else if (floorOwnerId && floorOwnerId !== author.id) {
    await notify(floorOwnerId, 'SUB_REPLY', { postId, postTitle: post.title, commentId: created.id });
  }
  if (parentId !== null && replyToUserId && replyToUserId !== author.id && replyToUserId !== floorOwnerId) {
    await notify(replyToUserId, 'SUB_REPLY', { postId, postTitle: post.title, commentId: created.id });
  }
  return { id: created.id };
}

export async function deleteComment(commentId: number, actor: SafeUser): Promise<void> {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } });
  if (!comment) throw new AppError(CODES.NOT_FOUND, '评论不存在');
  const isMod = actor.role === 'SUPER_ADMIN' || actor.role === 'MODERATOR';
  if (comment.authorId !== actor.id && !isMod) throw new AppError(CODES.FORBIDDEN, '没有删除权限');
  await prisma.$transaction(async (tx) => {
    await tx.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
    await tx.post.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } });
  });
}
