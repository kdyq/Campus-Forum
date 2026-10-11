// 互动服务：点赞与收藏（计数器在事务内同步更新）
import { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import { POST_STATUS } from '../constants/enums.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { expDelta, EXP_GAIN } from '../utils/level.ts';
import { notify } from './notification.service.ts';

export type LikeTargetType = 'POST' | 'COMMENT';

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

export async function likeTarget(user: SafeUser, targetType: LikeTargetType, targetId: number): Promise<{ liked: boolean; likeCount: number }> {
  const target =
    targetType === 'POST'
      ? await prisma.post.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, authorId: true, title: true, status: true } })
      : await prisma.comment.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, authorId: true, postId: true, status: true } });
  if (!target) throw new AppError(CODES.NOT_FOUND, '点赞目标不存在');
  if (target.status === POST_STATUS.REMOVED) throw new AppError(CODES.NOT_FOUND, '点赞目标不存在');

  try {
    await prisma.like.create({ data: { userId: user.id, targetType, targetId } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(CODES.ALREADY_LIKED, '已经赞过了');
    throw err;
  }

  const likeCount = await prisma.$transaction(async (tx) => {
    if (targetType === 'POST') {
      const p = await tx.post.update({ where: { id: targetId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
      return p.likeCount;
    }
    const c = await tx.comment.update({ where: { id: targetId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
    return c.likeCount;
  });

  if (target.authorId !== user.id) {
    const author = await prisma.user.findUnique({ where: { id: target.authorId }, select: { exp: true } });
    if (author) {
      const gain = expDelta(author.exp, EXP_GAIN.LIKE_RECEIVED);
      await prisma.user.update({ where: { id: target.authorId }, data: { exp: gain.exp, level: gain.level } });
    }
    const payload =
      targetType === 'POST'
        ? { postId: targetId, postTitle: (target as { title: string }).title }
        : { postId: (target as { postId: number }).postId, commentId: targetId };
    await notify(target.authorId, 'LIKE', payload);
  }
  return { liked: true, likeCount };
}

export async function unlikeTarget(user: SafeUser, targetType: LikeTargetType, targetId: number): Promise<{ liked: boolean; likeCount: number }> {
  const existing = await prisma.like.findUnique({
    where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
  });
  if (!existing) {
    const current =
      targetType === 'POST'
        ? await prisma.post.findUnique({ where: { id: targetId }, select: { likeCount: true } })
        : await prisma.comment.findUnique({ where: { id: targetId }, select: { likeCount: true } });
    return { liked: false, likeCount: current?.likeCount ?? 0 };
  }
  await prisma.like.delete({ where: { id: existing.id } });
  const result = await prisma.$transaction(async (tx) => {
    if (targetType === 'POST') {
      return tx.post.update({ where: { id: targetId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
    }
    return tx.comment.update({ where: { id: targetId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
  });
  return { liked: false, likeCount: result.likeCount };
}

export async function bookmarkPost(user: SafeUser, postId: number, folderId: number | null = null): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, authorId: true, title: true } });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);
  if (folderId !== null) {
    const folder = await prisma.bookmarkFolder.findFirst({ where: { id: folderId, userId: user.id } });
    if (!folder) throw new AppError(CODES.NOT_FOUND, '收藏夹不存在');
  }
  try {
    await prisma.bookmark.create({ data: { userId: user.id, postId, folderId } });
  } catch (err) {
    if (isUniqueViolation(err)) throw new AppError(CODES.ALREADY_BOOKMARKED, '已经在收藏夹里了');
    throw err;
  }
  const { bookmarkCount } = await prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { increment: 1 } }, select: { bookmarkCount: true } });
  if (post.authorId !== user.id) {
    await notify(post.authorId, 'BOOKMARK', { postId, postTitle: post.title });
  }
  return { bookmarked: true, bookmarkCount };
}

export async function unbookmarkPost(user: SafeUser, postId: number): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  const existing = await prisma.bookmark.findFirst({ where: { userId: user.id, postId } });
  if (!existing) {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { bookmarkCount: true } });
    return { bookmarked: false, bookmarkCount: post?.bookmarkCount ?? 0 };
  }
  await prisma.bookmark.delete({ where: { id: existing.id } });
  const { bookmarkCount } = await prisma.post.update({ where: { id: postId }, data: { bookmarkCount: { decrement: 1 } }, select: { bookmarkCount: true } });
  return { bookmarked: false, bookmarkCount };
}

export async function listMyBookmarks(user: SafeUser) {
  const [folders, bookmarks] = await Promise.all([
    prisma.bookmarkFolder.findMany({ where: { userId: user.id }, orderBy: [{ order: 'asc' }, { id: 'asc' }] }),
    prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true, title: true, excerpt: true, status: true, likeCount: true, commentCount: true, createdAt: true,
            board: { select: { name: true, slug: true } },
            author: { select: { displayName: true } },
          },
        },
      },
    }),
  ]);
  return {
    folders: [{ id: null, name: '默认收藏夹', order: 0 }, ...folders],
    items: bookmarks.map((b) => ({ folderId: b.folderId, savedAt: b.createdAt, post: b.post })),
  };
}

export async function createFolder(user: SafeUser, name: string) {
  const count = await prisma.bookmarkFolder.count({ where: { userId: user.id } });
  return prisma.bookmarkFolder.create({ data: { userId: user.id, name: name.slice(0, 30), order: count + 1 } });
}
