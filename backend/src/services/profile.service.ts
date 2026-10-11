// 用户主页：资料卡 + 四个 Tab（帖子 / 评论 / 收藏 / 点赞）
import type { SafeUser } from '../types/safe-user.ts';
import { AppError, CODES } from '../constants/codes.ts';
import { prisma } from '../utils/prisma.ts';
import { ROLES } from '../constants/enums.ts';

const PUBLIC_SELECT = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  college: true,
  grade: true,
  major: true,
  role: true,
  level: true,
  exp: true,
  status: true,
  createdAt: true,
} as const;

export async function getProfile(username: string, viewer: SafeUser | null | undefined) {
  const user = await prisma.user.findUnique({ where: { username }, select: PUBLIC_SELECT });
  if (!user) throw new AppError(CODES.NOT_FOUND, '用户不存在', 404);
  if (user.status === 'BANNED' && viewer?.role !== ROLES.SUPER_ADMIN && viewer?.role !== ROLES.MODERATOR) {
    throw new AppError(CODES.NOT_FOUND, '用户不存在', 404); // 封禁用户对外不可见
  }

  const [postCount, commentCount, likeReceived, acceptedCount, bookmarkCount] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id, deletedAt: null } }),
    prisma.comment.count({ where: { authorId: user.id, deletedAt: null } }),
    prisma.post.aggregate({ where: { authorId: user.id, deletedAt: null }, _sum: { likeCount: true } }),
    prisma.post.count({ where: { deletedAt: null, acceptedComment: { authorId: user.id } } }),
    prisma.bookmark.count({ where: { userId: user.id } }),
  ]);

  const isSelf = viewer?.id === user.id;
  const isModerator = viewer?.role === ROLES.SUPER_ADMIN || viewer?.role === ROLES.MODERATOR;

  return {
    ...user,
    email: isSelf || isModerator ? (await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }))?.email ?? null : null,
    stats: {
      postCount,
      commentCount,
      likeReceived: likeReceived._sum.likeCount ?? 0,
      acceptedCount,
      bookmarkCount,
    },
    isSelf,
  };
}

export async function listUserPosts(username: string, page: number, pageSize: number, viewer: SafeUser | null | undefined) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '用户不存在', 404);
  const isSelf = viewer?.id === user.id;
  const isModerator = viewer?.role === ROLES.SUPER_ADMIN || viewer?.role === ROLES.MODERATOR;
  const where = {
    authorId: user.id,
    deletedAt: null,
    ...(isSelf || isModerator ? {} : { status: { in: ['NORMAL', 'SOLVED', 'LOCKED'] } }),
  };
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { board: true },
    }),
  ]);
  return {
    total,
    items: posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      boardName: p.board.name,
      status: p.status,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      viewCount: p.viewCount,
      createdAt: p.createdAt,
    })),
  };
}

export async function listUserComments(username: string, page: number, pageSize: number) {
  const user = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '用户不存在', 404);
  const where = { authorId: user.id, deletedAt: null, status: { not: 'REMOVED' }, post: { deletedAt: null } };
  const [total, comments] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { post: { select: { id: true, title: true, board: { select: { name: true, slug: true } } } } },
    }),
  ]);
  return {
    total,
    items: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      likeCount: c.likeCount,
      post: c.post,
    })),
  };
}

export async function listUserLikedPosts(userId: number, page: number, pageSize: number) {
  const where = { userId, targetType: 'POST' as const };
  const [total, likes] = await Promise.all([
    prisma.like.count({ where }),
    prisma.like.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  if (likes.length === 0) return { total, items: [] };
  const posts = await prisma.post.findMany({
    where: { id: { in: likes.map((l) => l.targetId) }, deletedAt: null, status: { not: 'REMOVED' } },
    include: { board: true },
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  return {
    total,
    items: likes
      .map((l) => {
        const p = byId.get(l.targetId);
        if (!p) return null;
        return {
          id: p.id,
          title: p.title,
          excerpt: p.excerpt,
          boardName: p.board.name,
          likeCount: p.likeCount,
          commentCount: p.commentCount,
          likedAt: l.createdAt,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
  };
}
