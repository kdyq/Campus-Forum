// 关注：用户 / 标签 / 课程，关注流拉取被关注用户的帖子
import { AppError, CODES } from '../constants/codes.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { notify } from './notification.service.ts';

export type FollowTargetType = 'USER' | 'TAG' | 'COURSE';

export async function follow(actor: SafeUser, targetType: FollowTargetType, targetId: number) {
  if (targetType === 'USER' && targetId === actor.id) throw new AppError(CODES.SELF_TARGET, '不能关注自己');
  if (targetType === 'USER') {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw new AppError(CODES.NOT_FOUND, '用户不存在', 404);
  } else if (targetType === 'TAG') {
    const tag = await prisma.tag.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!tag) throw new AppError(CODES.NOT_FOUND, '标签不存在');
  } else {
    const course = await prisma.course.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!course) throw new AppError(CODES.NOT_FOUND, '课程不存在');
  }

  const existing = await prisma.follow.findFirst({
    where: { followerId: actor.id, ...(targetType === 'USER' ? { followeeId: targetId } : targetType === 'TAG' ? { tagId: targetId } : { courseId: targetId }) },
  });
  if (existing) return { following: true };

  await prisma.follow.create({
    data: {
      followerId: actor.id,
      ...(targetType === 'USER' ? { followeeId: targetId } : targetType === 'TAG' ? { tagId: targetId } : { courseId: targetId }),
    },
  });
  if (targetType === 'USER') {
    await notify(targetId, 'FOLLOW', { followerId: actor.id, followerName: actor.displayName, username: actor.username });
  }
  return { following: true };
}

export async function unfollow(actor: SafeUser, targetType: FollowTargetType, targetId: number) {
  await prisma.follow.deleteMany({
    where: { followerId: actor.id, ...(targetType === 'USER' ? { followeeId: targetId } : targetType === 'TAG' ? { tagId: targetId } : { courseId: targetId }) },
  });
  return { following: false };
}

export async function isFollowing(actorId: number, targetType: FollowTargetType, targetId: number): Promise<boolean> {
  const row = await prisma.follow.findFirst({
    where: { followerId: actorId, ...(targetType === 'USER' ? { followeeId: targetId } : targetType === 'TAG' ? { tagId: targetId } : { courseId: targetId }) },
    select: { id: true },
  });
  return row !== null;
}

export async function listMyFollows(actor: SafeUser) {
  const follows = await prisma.follow.findMany({
    where: { followerId: actor.id },
    orderBy: { id: 'desc' },
    include: {
      followee: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true } },
      tag: { select: { id: true, name: true, slug: true } },
      course: { select: { id: true, name: true, code: true } },
    },
  });
  const users = follows.filter((f) => f.followeeId !== null).map((f) => f.followee!);
  const tags = follows.filter((f) => f.tagId !== null).map((f) => f.tag!);
  const courses = follows.filter((f) => f.courseId !== null).map((f) => f.course!);
  return { users, tags, courses };
}

export async function followerCount(userId: number): Promise<number> {
  return prisma.follow.count({ where: { followeeId: userId } });
}

/** 关注流：被关注用户的帖子（游标分页同信息流） */
export async function followingFeed(actor: SafeUser, cursor: string | undefined, limit: number) {
  const follows = await prisma.follow.findMany({ where: { followerId: actor.id, followeeId: { not: null } }, select: { followeeId: true } });
  const authorIds = follows.map((f) => f.followeeId!);
  if (authorIds.length === 0) return { items: [], nextCursor: null };

  const where = {
    authorId: { in: authorIds },
    deletedAt: null,
    status: { in: ['NORMAL', 'SOLVED', 'LOCKED'] },
    ...(cursor
      ? (() => {
          const [iso, id] = Buffer.from(cursor, 'base64').toString('utf8').split('_');
          const ts = new Date(iso as string);
          if (Number.isNaN(ts.getTime()) || !id) throw new AppError(CODES.PARAM, '分页参数不合法');
          return {
            OR: [
              { lastActivityAt: { lt: ts } },
              { lastActivityAt: ts, id: { lt: Number(id) } },
            ],
          };
        })()
      : {}),
  };
  const rows = await prisma.post.findMany({
    where,
    orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
    take: limit,
    include: { board: true, author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
  });
  const last = rows[rows.length - 1];
  return {
    items: rows.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      board: { id: p.board.id, name: p.board.name, slug: p.board.slug },
      author: p.author,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      viewCount: p.viewCount,
      createdAt: p.createdAt,
      lastActivityAt: p.lastActivityAt,
    })),
    nextCursor: last ? Buffer.from(`${last.lastActivityAt.toISOString()}_${last.id}`, 'utf8').toString('base64') : null,
  };
}
