// 帖子服务：信息流（常数次查询）、详情、创作、编辑历史、软删除、采纳
import { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import { POST_STATUS, ROLES } from '../constants/enums.ts';
import { prisma } from '../utils/prisma.ts';
import { safeUserSelect, type SafeUser } from '../types/safe-user.ts';
import { expDelta, EXP_GAIN } from '../utils/level.ts';
import { notify } from './notification.service.ts';
import { checkSensitive } from './sensitive.service.ts';

const SANDBOX_MS = 24 * 3600 * 1000; // 新账号 24h 内发帖先审后显

export const POST_TITLE_MIN = 4;
export const POST_TITLE_MAX = 80;
export const POST_BODY_MAX = 20000;
export const TAG_MAX_PER_POST = 5;
export const FREE_EDIT_WINDOW_MS = 30 * 60 * 1000; // 30 分钟内自由编辑，超时留编辑历史
const HOT_WINDOW_DAYS = 7;
const HOT_CANDIDATES = 500;

export const FEED_STATUSES = [POST_STATUS.NORMAL, POST_STATUS.SOLVED, POST_STATUS.LOCKED] as const;

function excerptOf(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~|_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function firstImageUrl(content: string): string | null {
  const m = /!\[[^\]]*\]\((\/uploads\/[^)\s]+)\)/.exec(content);
  return m?.[1] ?? null;
}

export interface FeedParams {
  boardSlug?: string;
  tagSlug?: string;
  courseId?: number;
  authorId?: number;
  sort: 'latest' | 'hot' | 'featured';
  cursor?: string; // base64("lastActivityAt_id")，仅 latest / featured
  page?: number; // 仅 hot
  pageSize?: number;
  viewer?: SafeUser | null;
}

export interface FeedItem {
  id: number;
  title: string;
  excerpt: string | null;
  board: { id: number; name: string; slug: string };
  author: { id: number; username: string | null; displayName: string; avatarUrl: string | null } | null;
  isAnonymous: boolean;
  realAuthorVisible: boolean;
  realAuthor: { id: number; username: string; displayName: string } | null;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  hasAccepted: boolean;
  thumbnailUrl: string | null;
  tags: { id: number; name: string; slug: string }[];
  createdAt: Date;
  lastActivityAt: Date;
  viewerLiked: boolean;
  viewerBookmarked: boolean;
}

function canSeeRealAuthor(viewer: SafeUser | null | undefined): boolean {
  return viewer?.role === ROLES.SUPER_ADMIN || viewer?.role === ROLES.MODERATOR;
}

function decodeCursor(cursor: string): { lastActivityAt: Date; id: number } {
  try {
    const [iso, id] = Buffer.from(cursor, 'base64').toString('utf8').split('_');
    const ts = new Date(iso as string);
    if (Number.isNaN(ts.getTime()) || !id) throw new Error('bad cursor');
    return { lastActivityAt: ts, id: Number(id) };
  } catch {
    throw new AppError(CODES.PARAM, '分页参数不合法');
  }
}

function encodeCursor(lastActivityAt: Date, id: number): string {
  return Buffer.from(`${lastActivityAt.toISOString()}_${id}`, 'utf8').toString('base64');
}

function toFeedItem(
  p: Prisma.PostGetPayload<{
    include: { board: true; author: { select: typeof safeUserSelect }; tags: { include: { tag: true } } };
  }>,
  viewer: SafeUser | null | undefined,
  viewerLiked = false,
  viewerBookmarked = false,
): FeedItem {
  const anonymous = p.isAnonymous;
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    board: { id: p.board.id, name: p.board.name, slug: p.board.slug },
    author: anonymous
      ? null
      : { id: p.author.id, username: p.author.username, displayName: p.author.displayName, avatarUrl: p.author.avatarUrl },
    isAnonymous: anonymous,
    realAuthorVisible: anonymous && canSeeRealAuthor(viewer),
    realAuthor: anonymous && canSeeRealAuthor(viewer) ? { id: p.author.id, username: p.author.username, displayName: p.author.displayName } : null,
    status: p.status,
    isPinned: p.isPinned,
    isFeatured: p.isFeatured,
    viewCount: p.viewCount,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    bookmarkCount: p.bookmarkCount,
    hasAccepted: p.acceptedCommentId !== null,
    thumbnailUrl: firstImageUrl(p.content),
    tags: p.tags.map((pt) => ({ id: pt.tag.id, name: pt.tag.name, slug: pt.tag.slug })),
    createdAt: p.createdAt,
    lastActivityAt: p.lastActivityAt,
    viewerLiked,
    viewerBookmarked,
  };
}

export async function listFeed(params: FeedParams): Promise<{ items: FeedItem[]; nextCursor: string | null; total?: number }> {
  const pageSize = Math.min(Math.max(params.pageSize ?? 20, 1), 50);
  const viewer = params.viewer;
  const baseWhere: Prisma.PostWhereInput = {
    deletedAt: null,
    status: { in: [...FEED_STATUSES] },
    ...(params.boardSlug ? { board: { slug: params.boardSlug } } : {}),
    ...(params.tagSlug ? { tags: { some: { tag: { slug: params.tagSlug } } } } : {}),
    ...(params.courseId ? { courseId: params.courseId } : {}),
    ...(params.authorId ? { authorId: params.authorId } : {}),
  };
  const include = {
    board: true,
    author: { select: safeUserSelect },
    tags: { include: { tag: true } },
  } satisfies Prisma.PostInclude;

  if (params.sort === 'hot') {
    const since = new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 3600 * 1000);
    const rows = await prisma.post.findMany({
      where: { ...baseWhere, createdAt: { gte: since } },
      include,
      orderBy: { lastActivityAt: 'desc' },
      take: HOT_CANDIDATES,
    });
    const scored = rows
      .map((p) => ({
        p,
        score:
          (p.likeCount * 3 + p.commentCount * 5 + p.bookmarkCount * 4 + p.viewCount * 0.1) /
          Math.pow(Math.max((Date.now() - p.createdAt.getTime()) / 3600000, 0) + 2, 1.5),
      }))
      .sort((a, b) => b.score - a.score);
    const page = Math.max(params.page ?? 1, 1);
    const slice = scored.slice((page - 1) * pageSize, page * pageSize);
    const items = await attachViewerFlags(slice.map((s) => s.p), viewer);
    return { items, nextCursor: null, total: scored.length };
  }

  const where: Prisma.PostWhereInput =
    params.sort === 'featured' ? { ...baseWhere, isFeatured: true } : baseWhere;

  // 置顶帖只在第一页出现且固定在最前（latest 排序下，流式列表始终排除置顶，避免翻页重复）
  let pinned: (Prisma.PostGetPayload<{ include: typeof include }>)[] = [];
  const excludePinned: Prisma.PostWhereInput = params.sort === 'latest' ? { isPinned: false } : {};
  if (!params.cursor && params.sort === 'latest') {
    pinned = await prisma.post.findMany({
      where: { ...where, isPinned: true },
      include,
      orderBy: { lastActivityAt: 'desc' },
      take: 5,
    });
  }

  const cursorCond: Prisma.PostWhereInput = params.cursor
    ? (() => {
        const c = decodeCursor(params.cursor);
        return {
          OR: [
            { lastActivityAt: { lt: c.lastActivityAt } },
            { lastActivityAt: c.lastActivityAt, id: { lt: c.id } },
          ],
        };
      })()
    : {};

  const take = pageSize - pinned.length;
  const rows = take > 0
    ? await prisma.post.findMany({
        where: { ...where, ...excludePinned, ...cursorCond },
        include,
        orderBy: [{ lastActivityAt: 'desc' }, { id: 'desc' }],
        take,
      })
    : [];

  const merged = [...pinned, ...rows];
  const items = await attachViewerFlags(merged, viewer);
  const last = rows[rows.length - 1];
  const nextCursor = last && rows.length >= take && take === pageSize - pinned.length ? encodeCursor(last.lastActivityAt, last.id) : null;
  return { items, nextCursor: merged.length < pageSize ? null : nextCursor };
}

/** 批量查询当前用户是否已赞/已收藏（禁止逐条查询） */
async function attachViewerFlags(
  posts: (Prisma.PostGetPayload<{ include: {
    board: true;
    author: { select: typeof safeUserSelect };
    tags: { include: { tag: true } };
  } }>)[],
  viewer: SafeUser | null | undefined,
): Promise<FeedItem[]> {
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  let likedSet = new Set<number>();
  let bookmarkedSet = new Set<number>();
  if (viewer) {
    const [likes, bookmarks] = await Promise.all([
      prisma.like.findMany({ where: { userId: viewer.id, targetType: 'POST', targetId: { in: ids } }, select: { targetId: true } }),
      prisma.bookmark.findMany({ where: { userId: viewer.id, postId: { in: ids } }, select: { postId: true } }),
    ]);
    likedSet = new Set(likes.map((l) => l.targetId));
    bookmarkedSet = new Set(bookmarks.map((b) => b.postId));
  }
  return posts.map((p) => toFeedItem(p, viewer, likedSet.has(p.id), bookmarkedSet.has(p.id)));
}

export async function getPostDetail(id: number, viewer: SafeUser | null | undefined) {
  const post = await prisma.post.findFirst({
    where: { id, deletedAt: null },
    include: {
      board: true,
      author: { select: safeUserSelect },
      course: true,
      tags: { include: { tag: true } },
      acceptedComment: { include: { author: { select: safeUserSelect } } },
    },
  });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);

  const [likes, bookmarks] = viewer
    ? await Promise.all([
        prisma.like.findFirst({ where: { userId: viewer.id, targetType: 'POST', targetId: id }, select: { id: true } }),
        prisma.bookmark.findFirst({ where: { userId: viewer.id, postId: id }, select: { id: true } }),
      ])
    : [null, null];

  const authorVisible = !post.isAnonymous || canSeeRealAuthor(viewer);
  return {
    ...(toFeedItem(post as never, viewer, Boolean(likes), Boolean(bookmarks)) as object),
    content: post.content,
    editedAt: post.editedAt,
    editCount: post.editCount,
    courseId: post.courseId,
    course: post.course
      ? { id: post.course.id, name: post.course.name, code: post.course.code, teacher: post.course.teacher, department: post.course.department }
      : null,
    acceptedComment: post.acceptedComment
      ? {
          id: post.acceptedComment.id,
          content: post.acceptedComment.content,
          createdAt: post.acceptedComment.createdAt,
          author: post.acceptedComment.isAnonymous ? null : post.acceptedComment.author,
          isAnonymous: post.acceptedComment.isAnonymous,
        }
      : null,
    authorVisible,
    authorSafe: authorVisible ? post.author : null,
  };
}

export interface CreatePostInput {
  boardId: number;
  title: string;
  content: string;
  isAnonymous: boolean;
  tagIds: number[];
  courseId?: number | null;
}

export async function createPost(author: SafeUser, input: CreatePostInput) {
  const title = input.title.trim();
  const content = input.content;
  if (title.length < POST_TITLE_MIN || title.length > POST_TITLE_MAX) {
    throw new AppError(CODES.PARAM, `标题长度需在 ${POST_TITLE_MIN} 到 ${POST_TITLE_MAX} 字之间`);
  }
  if (content.length > POST_BODY_MAX) {
    throw new AppError(CODES.CONTENT_TOO_LONG, `正文不能超过 ${POST_BODY_MAX} 字`);
  }
  if (input.tagIds.length > TAG_MAX_PER_POST) {
    throw new AppError(CODES.PARAM, `每个帖子最多 ${TAG_MAX_PER_POST} 个标签`);
  }

  const [board, tags, course] = await Promise.all([
    prisma.board.findUnique({ where: { id: input.boardId } }),
    prisma.tag.findMany({ where: { id: { in: input.tagIds } } }),
    input.courseId ? prisma.course.findUnique({ where: { id: input.courseId } }) : Promise.resolve(null),
  ]);
  if (!board) throw new AppError(CODES.BOARD_NOT_FOUND, '板块不存在');
  if (tags.length !== input.tagIds.length) throw new AppError(CODES.PARAM, '包含不存在的标签');
  if (input.courseId && !course) throw new AppError(CODES.PARAM, '关联的课程不存在');

  const sensitive = await checkSensitive(title, content);
  if (sensitive === 'blocked') throw new AppError(CODES.SENSITIVE, '内容包含不允许发布的词汇，请修改后再发布');

  // 新账号沙箱：注册 24 小时内发帖进入审核队列；命中 REVIEW 词同样转审核
  const sandboxed = author.createdAt.getTime() > Date.now() - SANDBOX_MS;
  const needsReview = sandboxed || sensitive === 'review';

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        boardId: board.id,
        authorId: author.id,
        title,
        content,
        excerpt: excerptOf(content),
        isAnonymous: input.isAnonymous,
        courseId: course?.id ?? null,
        status: needsReview ? POST_STATUS.PENDING : POST_STATUS.NORMAL,
        tags: { createMany: { data: input.tagIds.map((tagId) => ({ tagId })) } },
      },
    });
    if (input.tagIds.length > 0) {
      await tx.tag.updateMany({ where: { id: { in: input.tagIds } }, data: { postCount: { increment: 1 } } });
    }
    const gain = expDelta(author.exp, EXP_GAIN.POST);
    await tx.user.update({ where: { id: author.id }, data: { exp: gain.exp, level: gain.level, lastActiveAt: new Date() } });
    return created;
  });
  return { id: post.id, pending: needsReview, reason: sandboxed ? 'SANDBOX' : 'REVIEW' };
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  isAnonymous?: boolean;
  tagIds?: number[];
  courseId?: number | null;
}

export async function updatePost(postId: number, editor: SafeUser, input: UpdatePostInput) {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { tags: true } });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);
  if (post.authorId !== editor.id && !canSeeRealAuthor(editor)) {
    throw new AppError(CODES.NO_EDIT_PERM, '没有编辑权限');
  }
  if (post.status === POST_STATUS.LOCKED && post.authorId === editor.id && !canSeeRealAuthor(editor)) {
    throw new AppError(CODES.POST_LOCKED, '帖子已锁定');
  }

  const title = input.title?.trim() ?? post.title;
  if (title.length < POST_TITLE_MIN || title.length > POST_TITLE_MAX) {
    throw new AppError(CODES.PARAM, `标题长度需在 ${POST_TITLE_MIN} 到 ${POST_TITLE_MAX} 字之间`);
  }
  const content = input.content ?? post.content;
  if (content.length > POST_BODY_MAX) throw new AppError(CODES.CONTENT_TOO_LONG, `正文不能超过 ${POST_BODY_MAX} 字`);
  const tagIds = input.tagIds ?? post.tags.map((pt) => pt.tagId);
  if (tagIds.length > TAG_MAX_PER_POST) throw new AppError(CODES.PARAM, `每个帖子最多 ${TAG_MAX_PER_POST} 个标签`);
  if (input.courseId !== undefined && input.courseId !== null) {
    const course = await prisma.course.findUnique({ where: { id: input.courseId } });
    if (!course) throw new AppError(CODES.PARAM, '关联的课程不存在');
  }

  const freeEdit = Date.now() - post.createdAt.getTime() <= FREE_EDIT_WINDOW_MS;
  await prisma.$transaction(async (tx) => {
    if (!freeEdit) {
      // 超时编辑：保留编辑历史
      await tx.postRevision.create({
        data: { postId: post.id, title: post.title, content: post.content, editorId: editor.id },
      });
    }
    await tx.post.update({
      where: { id: post.id },
      data: {
        title,
        content,
        excerpt: excerptOf(content),
        isAnonymous: input.isAnonymous ?? post.isAnonymous,
        courseId: input.courseId === undefined ? post.courseId : input.courseId,
        editedAt: new Date(),
        editCount: freeEdit ? post.editCount : { increment: 1 },
        tags: input.tagIds
          ? {
              deleteMany: {},
              createMany: { data: tagIds.map((tagId) => ({ tagId })) },
            }
          : undefined,
      },
    });
    if (input.tagIds) {
      const removed = post.tags.map((pt) => pt.tagId).filter((id) => !tagIds.includes(id));
      const added = tagIds.filter((id) => !post.tags.some((pt) => pt.tagId === id));
      if (removed.length) await tx.tag.updateMany({ where: { id: { in: removed } }, data: { postCount: { decrement: 1 } } });
      if (added.length) await tx.tag.updateMany({ where: { id: { in: added } }, data: { postCount: { increment: 1 } } });
    }
  });
  return { id: post.id, revisionSaved: !freeEdit };
}

export async function deletePost(postId: number, actor: SafeUser) {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null }, include: { tags: true } });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);
  if (post.authorId !== actor.id && !canSeeRealAuthor(actor)) throw new AppError(CODES.FORBIDDEN, '没有删除权限');
  await prisma.$transaction(async (tx) => {
    await tx.post.update({ where: { id: post.id }, data: { deletedAt: new Date(), status: POST_STATUS.REMOVED } });
    const tagIds = post.tags.map((pt) => pt.tagId);
    if (tagIds.length) await tx.tag.updateMany({ where: { id: { in: tagIds } }, data: { postCount: { decrement: 1 } } });
  });
  return { deleted: true };
}

export async function acceptComment(postId: number, commentId: number, actor: SafeUser) {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null } });
  if (!post) throw new AppError(CODES.POST_NOT_FOUND, '帖子不存在或已删除', 404);
  if (post.authorId !== actor.id && !canSeeRealAuthor(actor)) {
    throw new AppError(CODES.FORBIDDEN, '只有楼主可以采纳答案');
  }
  if (post.acceptedCommentId) throw new AppError(CODES.PARAM, '该帖子已采纳过答案');
  const comment = await prisma.comment.findFirst({
    where: { id: commentId, postId, deletedAt: null, parentId: null, status: 'NORMAL' },
  });
  if (!comment) throw new AppError(CODES.NOT_FOUND, '仅可采纳顶级评论为最佳答案');

  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: post.id },
      data: { acceptedCommentId: comment.id, status: POST_STATUS.SOLVED },
    });
    const answerer = await tx.user.findUnique({ where: { id: comment.authorId } });
    if (answerer) {
      const gain = expDelta(answerer.exp, EXP_GAIN.ACCEPTED);
      await tx.user.update({ where: { id: answerer.id }, data: { exp: gain.exp, level: gain.level } });
    }
  });
  await notify(comment.authorId, 'ACCEPTED', { postId, postTitle: post.title, commentId: comment.id });
  return { accepted: true };
}
