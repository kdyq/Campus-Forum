// 杂项：标签列表、社区数据、帖子图片上传
import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import { prisma } from '../utils/prisma.ts';

export async function listTagsHandler(_req: Request, res: Response) {
  const tags = await prisma.tag.findMany({
    orderBy: [{ postCount: 'desc' }, { id: 'asc' }],
    select: { id: true, name: true, slug: true, postCount: true, isOfficial: true },
  });
  ok(res, tags);
}

export async function statsHandler(_req: Request, res: Response) {
  const [totalPosts, totalComments, totalUsers, todayStart] = [
    await prisma.post.count({ where: { deletedAt: null } }),
    await prisma.comment.count({ where: { deletedAt: null } }),
    await prisma.user.count(),
    new Date(new Date().setHours(0, 0, 0, 0)),
  ];
  const todayPosts = await prisma.post.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } });

  // 活跃答主：被采纳答案数 Top 5
  const accepted = await prisma.post.findMany({
    where: { acceptedCommentId: { not: null }, deletedAt: null },
    include: { acceptedComment: { select: { authorId: true } } },
    take: 200,
    orderBy: { lastActivityAt: 'desc' },
  });
  const counter = new Map<number, number>();
  for (const p of accepted) {
    const authorId = p.acceptedComment?.authorId;
    if (authorId) counter.set(authorId, (counter.get(authorId) ?? 0) + 1);
  }
  const topIds = [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const users = topIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topIds.map(([id]) => id) } },
        select: { id: true, username: true, displayName: true, avatarUrl: true, level: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  const activeAnswerers = topIds
    .map(([id, count]) => {
      const u = byId.get(id);
      return u ? { ...u, acceptedCount: count } : null;
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  ok(res, { totalPosts, totalComments, totalUsers, todayPosts, activeAnswerers });
}
