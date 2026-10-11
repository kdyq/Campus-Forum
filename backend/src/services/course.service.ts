// 课程库（差异化核心）：课程主页聚合讨论、结构化评分与聚合
import { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { expDelta, EXP_GAIN } from '../utils/level.ts';
import { safeUserSelect } from '../types/safe-user.ts';

export async function listCourses(q?: string) {
  const where: Prisma.CourseWhereInput = q ? { OR: [{ name: { contains: q } }, { code: { contains: q } }, { teacher: { contains: q } }] } : {};
  const courses = await prisma.course.findMany({
    where,
    orderBy: [{ ratingCount: 'desc' }, { id: 'asc' }],
    include: { _count: { select: { posts: true, reviews: true } } },
  });
  return courses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    department: c.department,
    teacher: c.teacher,
    ratingScore: c.ratingScore,
    ratingCount: c.ratingCount,
    postCount: c._count.posts,
    reviewCount: c._count.reviews,
  }));
}

export async function getCourseByCode(code: string, viewer: SafeUser | null | undefined) {
  const course = await prisma.course.findUnique({
    where: { code: code.toUpperCase() },
    include: { _count: { select: { posts: true, reviews: true } } },
  });
  if (!course) throw new AppError(CODES.NOT_FOUND, '课程不存在', 404);

  const [posts, reviews, myReview] = await Promise.all([
    prisma.post.findMany({
      where: { courseId: course.id, deletedAt: null, status: { in: ['NORMAL', 'SOLVED', 'LOCKED'] } },
      orderBy: { lastActivityAt: 'desc' },
      take: 50,
      include: { board: true, author: { select: safeUserSelect } },
    }),
    prisma.courseReview.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { id: true, displayName: true } } },
    }),
    viewer ? prisma.courseReview.findUnique({ where: { courseId_userId: { courseId: course.id, userId: viewer.id } } }) : Promise.resolve(null),
  ]);

  return {
    id: course.id,
    name: course.name,
    code: course.code,
    department: course.department,
    teacher: course.teacher,
    ratingScore: course.ratingScore,
    ratingCount: course.ratingCount,
    workloadScore: course.workloadScore,
    attendanceScore: course.attendanceScore,
    recommendScore: course.recommendScore,
    postCount: course._count.posts,
    reviewCount: course._count.reviews,
    discussions: posts.map((p) => ({
      id: p.id,
      title: p.title,
      excerpt: p.excerpt,
      boardName: p.board.name,
      authorName: p.isAnonymous ? '匿名用户' : p.author.displayName,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      lastActivityAt: p.lastActivityAt,
    })),
    reviews: reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      workload: r.workload,
      attendance: r.attendance,
      recommend: r.recommend,
      content: r.content,
      isAnonymous: r.isAnonymous,
      authorName: r.isAnonymous ? '匿名同学' : r.user.displayName,
      createdAt: r.createdAt,
    })),
    myReview: myReview
      ? { rating: myReview.rating, workload: myReview.workload, attendance: myReview.attendance, recommend: myReview.recommend, content: myReview.content }
      : null,
  };
}

export interface ReviewInput {
  rating: number;
  workload: number;
  attendance: number;
  recommend: number;
  content?: string;
  isAnonymous: boolean;
}

function clampScore(n: number): number {
  return Math.min(5, Math.max(1, Math.round(n)));
}

export async function submitReview(user: SafeUser, courseId: number, input: ReviewInput) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(CODES.NOT_FOUND, '课程不存在', 404);
  const rating = clampScore(input.rating);
  const workload = clampScore(input.workload);
  const attendance = clampScore(input.attendance);
  const recommend = clampScore(input.recommend);

  await prisma.courseReview.upsert({
    where: { courseId_userId: { courseId, userId: user.id } },
    update: { rating, workload, attendance, recommend, content: input.content?.slice(0, 2000) ?? null, isAnonymous: input.isAnonymous },
    create: { courseId, userId: user.id, rating, workload, attendance, recommend, content: input.content?.slice(0, 2000) ?? null, isAnonymous: input.isAnonymous },
  });

  // 聚合分在评分提交后即时更新（验收项）
  const agg = await prisma.courseReview.aggregate({
    where: { courseId },
    _avg: { rating: true, workload: true, attendance: true, recommend: true },
    _count: { _all: true },
  });
  const round1 = (n: number | null) => (n === null ? null : Math.round(n * 10) / 10);
  await prisma.course.update({
    where: { id: courseId },
    data: {
      ratingScore: round1(agg._avg.rating),
      workloadScore: round1(agg._avg.workload),
      attendanceScore: round1(agg._avg.attendance),
      recommendScore: round1(agg._avg.recommend),
      ratingCount: agg._count._all,
    },
  });

  const gain = expDelta(user.exp, EXP_GAIN.COMMENT);
  await prisma.user.update({ where: { id: user.id }, data: { exp: gain.exp, level: gain.level } });

  return {
    ratingScore: round1(agg._avg.rating),
    ratingCount: agg._count._all,
  };
}
