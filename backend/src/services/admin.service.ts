// 管理后台：数据看板、用户管理、内容管理（含回收站）、板块标签维护、审计日志
import type { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import { POST_STATUS, USER_STATUS } from '../constants/enums.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';
import { logAudit } from '../utils/audit.ts';

export async function dashboardStats() {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  const [totalPosts, totalComments, totalUsers, todayPosts, pendingPosts, pendingReports, activeMutes] = await Promise.all([
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.user.count(),
    prisma.post.count({ where: { deletedAt: null, createdAt: { gte: todayStart } } }),
    prisma.post.count({ where: { status: POST_STATUS.PENDING, deletedAt: null } }),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { status: USER_STATUS.MUTED, mutedUntil: { gt: new Date() } } }),
  ]);
  return { totalPosts, totalComments, totalUsers, todayPosts, pendingPosts, pendingReports, activeMutes };
}

export async function listUsers(params: { q?: string; page: number; pageSize: number }) {
  const where: Prisma.UserWhereInput = params.q
    ? { OR: [{ username: { contains: params.q } }, { displayName: { contains: params.q } }, { email: { contains: params.q } }] }
    : {};
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      select: {
        id: true, username: true, displayName: true, email: true, role: true, status: true,
        level: true, exp: true, emailVerified: true, createdAt: true, mutedUntil: true,
        _count: { select: { posts: true, comments: true } },
      },
    }),
  ]);
  return { total, items: users };
}

export async function updateUser(actor: SafeUser, userId: number, input: { status?: string; mutedUntil?: Date | null; role?: string }, ip?: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(CODES.NOT_FOUND, '用户不存在', 404);
  if (user.role === 'SUPER_ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw new AppError(CODES.FORBIDDEN, '不能操作超级管理员');
  }
  if (user.id === actor.id && input.status === 'BANNED') throw new AppError(CODES.SELF_TARGET, '不能封禁自己');

  const data: Prisma.UserUpdateInput = {};
  if (input.status) data.status = input.status;
  if (input.mutedUntil !== undefined) data.mutedUntil = input.mutedUntil;
  if (input.role) {
    if (actor.role !== 'SUPER_ADMIN') throw new AppError(CODES.FORBIDDEN, '仅超级管理员可调整角色');
    if (user.role === 'SUPER_ADMIN') throw new AppError(CODES.FORBIDDEN, '不能修改超级管理员的角色');
    data.role = input.role;
  }
  const updated = await prisma.user.update({ where: { id: userId }, data });
  await logAudit(actor.id, input.role ? 'user.set_role' : input.status === 'BANNED' ? 'user.ban' : 'user.update', 'USER', userId, { status: updated.status, role: updated.role }, ip);
  return { id: updated.id, status: updated.status, role: updated.role, mutedUntil: updated.mutedUntil };
}

export async function listAdminPosts(params: { status?: string; q?: string; page: number; pageSize: number }) {
  const where: Prisma.PostWhereInput = {
    ...(params.status ? { status: params.status } : {}),
    ...(params.q ? { title: { contains: params.q } } : {}),
  };
  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: {
        author: { select: { id: true, username: true, displayName: true } },
        board: { select: { name: true, slug: true } },
      },
    }),
  ]);
  return { total, items: posts };
}

export type PostAdminAction = 'PIN' | 'UNPIN' | 'FEATURE' | 'UNFEATURE' | 'LOCK' | 'UNLOCK' | 'REMOVE' | 'RESTORE' | 'APPROVE';

export async function postAction(actor: SafeUser, postId: number, action: PostAdminAction, ip?: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new AppError(CODES.NOT_FOUND, '帖子不存在', 404);

  const data: Prisma.PostUpdateInput = {};
  switch (action) {
    case 'PIN': data.isPinned = true; break;
    case 'UNPIN': data.isPinned = false; break;
    case 'FEATURE': data.isFeatured = true; break;
    case 'UNFEATURE': data.isFeatured = false; break;
    case 'LOCK': data.status = POST_STATUS.LOCKED; break;
    case 'UNLOCK': data.status = POST_STATUS.NORMAL; break;
    case 'REMOVE':
      data.status = POST_STATUS.REMOVED;
      data.deletedAt = new Date();
      break;
    case 'RESTORE':
      data.status = POST_STATUS.NORMAL;
      data.deletedAt = null;
      break;
    case 'APPROVE':
      data.status = POST_STATUS.NORMAL;
      break;
  }
  const updated = await prisma.post.update({ where: { id: postId }, data });
  await logAudit(actor.id, `post.${action.toLowerCase()}`, 'POST', postId, { status: updated.status }, ip);
  return { id: updated.id, status: updated.status, isPinned: updated.isPinned, isFeatured: updated.isFeatured };
}

export async function listAuditLogs(params: { page: number; pageSize: number }) {
  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { id: 'desc' },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      include: { actor: { select: { displayName: true, username: true } } },
    }),
  ]);
  return { total, items: logs };
}

export async function updateBoard(actor: SafeUser, boardId: number, input: { name?: string; description?: string; order?: number; status?: string }, ip?: string) {
  const board = await prisma.board.update({ where: { id: boardId }, data: input });
  await logAudit(actor.id, 'board.update', 'BOARD', boardId, input, ip);
  return board;
}

export async function createTag(actor: SafeUser, name: string, isOfficial = false, ip?: string) {
  const slug = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .slice(0, 30) || `tag-${Date.now()}`;
  const tag = await prisma.tag.create({ data: { name: name.slice(0, 20), slug, isOfficial } });
  await logAudit(actor.id, 'tag.create', 'TAG', tag.id, { name }, ip);
  return tag;
}
