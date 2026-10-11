// 全文搜索：MySQL ngram 全文索引（BOOLEAN MODE），关键词过滤布尔操作符防注入
import { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import { FEED_STATUSES } from './post.service.ts';
import { prisma } from '../utils/prisma.ts';
import { safeUserSelect } from '../types/safe-user.ts';

export interface SearchParams {
  keyword: string;
  boardSlug?: string;
  tagSlug?: string;
  page: number;
  pageSize: number;
}

export async function searchPosts(params: SearchParams) {
  const keyword = params.keyword.replace(/[+\-><()~*@"']/g, ' ').trim();
  if (!keyword) throw new AppError(CODES.PARAM, '请输入搜索关键词');

  // 先取命中 id 与评分（带过滤条件时多取一些再在应用层精筛）
  const rows = await prisma.$queryRaw<Array<{ id: number; score: number }>>`
    SELECT id, MATCH(title, content) AGAINST(${keyword} IN BOOLEAN MODE) AS score
    FROM Post
    WHERE MATCH(title, content) AGAINST(${keyword} IN BOOLEAN MODE)
      AND deletedAt IS NULL
      AND status IN (${Prisma.join([...FEED_STATUSES])})
    ORDER BY score DESC
    LIMIT 200`;

  if (rows.length === 0) return { items: [], total: 0, page: params.page, pageSize: params.pageSize };

  const scoreMap = new Map(rows.map((r) => [Number(r.id), Number(r.score)]));
  const posts = await prisma.post.findMany({
    where: {
      id: { in: [...scoreMap.keys()] },
      ...(params.boardSlug ? { board: { slug: params.boardSlug } } : {}),
      ...(params.tagSlug ? { tags: { some: { tag: { slug: params.tagSlug } } } } : {}),
    },
    include: {
      board: true,
      author: { select: safeUserSelect },
      tags: { include: { tag: true } },
    },
  });

  const sorted = posts
    .map((p) => ({ p, score: scoreMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
  const total = sorted.length;
  const slice = sorted.slice((params.page - 1) * params.pageSize, params.page * params.pageSize);

  const items = slice.map(({ p }) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    board: { id: p.board.id, name: p.board.name, slug: p.board.slug },
    author: p.isAnonymous
      ? null
      : { id: p.author.id, username: p.author.username, displayName: p.author.displayName, avatarUrl: p.author.avatarUrl },
    isAnonymous: p.isAnonymous,
    status: p.status,
    isPinned: p.isPinned,
    isFeatured: p.isFeatured,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    viewCount: p.viewCount,
    hasAccepted: p.acceptedCommentId !== null,
    thumbnailUrl: null,
    tags: p.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
    createdAt: p.createdAt,
    lastActivityAt: p.lastActivityAt,
    score: scoreMap.get(p.id) ?? 0,
  }));
  return { items, total, page: params.page, pageSize: params.pageSize };
}
