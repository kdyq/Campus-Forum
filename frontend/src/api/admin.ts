// 用户主页 / 举报 / 管理后台接口
import { api, get, post } from './client';
import type { SafeUser } from '@/types/api';

// ---- 用户主页 ----
export interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  college: string | null;
  grade: string | null;
  major: string | null;
  role: string;
  level: number;
  exp: number;
  status: string;
  createdAt: string;
  email: string | null;
  stats: {
    postCount: number;
    commentCount: number;
    likeReceived: number;
    acceptedCount: number;
    bookmarkCount: number;
  };
  isSelf: boolean;
}

export function fetchProfile(username: string): Promise<UserProfile> {
  return get<UserProfile>(`/users/${username}`);
}

export interface UserPostItem {
  id: number;
  title: string;
  excerpt: string | null;
  boardName: string;
  status: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  createdAt: string;
}

export function fetchUserPosts(username: string, page = 1): Promise<{ total: number; items: UserPostItem[] }> {
  return get(`/users/${username}/posts?page=${page}`);
}

export interface UserCommentItem {
  id: number;
  content: string;
  createdAt: string;
  likeCount: number;
  post: { id: number; title: string; board: { name: string; slug: string } };
}

export function fetchUserComments(username: string, page = 1): Promise<{ total: number; items: UserCommentItem[] }> {
  return get(`/users/${username}/comments?page=${page}`);
}

export function fetchMyLikedPosts(page = 1): Promise<{ total: number; items: { id: number; title: string; excerpt: string | null; boardName: string; likeCount: number; commentCount: number; likedAt: string }[] }> {
  return get(`/users/me/likes?page=${page}`);
}

// ---- 举报 ----
export function fetchReportReasons(): Promise<string[]> {
  return get<string[]>('/reports/reasons');
}

export function createReport(payload: { targetType: 'POST' | 'COMMENT' | 'USER'; targetId: number; reason: string; detail?: string }): Promise<{ id: number }> {
  return post('/reports', payload);
}

// ---- 管理后台 ----
export interface AdminStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  todayPosts: number;
  pendingPosts: number;
  pendingReports: number;
  activeMutes: number;
}

export function fetchAdminStats(): Promise<AdminStats> {
  return get<AdminStats>('/admin/stats');
}

export interface AdminUserItem extends SafeUser {
  _count: { posts: number; comments: number };
}

export function fetchAdminUsers(q: string, page = 1): Promise<{ total: number; items: AdminUserItem[] }> {
  return get(`/admin/users?q=${encodeURIComponent(q)}&page=${page}`);
}

export function updateAdminUser(
  id: number,
  payload: { status?: string; mutedUntil?: string | null; role?: string },
): Promise<{ id: number; status: string; role: string; mutedUntil: string | null }> {
  return api.patch(`/admin/users/${id}`, payload).then((r) => r.data.data);
}

export interface AdminPostItem {
  id: number;
  title: string;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  isAnonymous: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  deletedAt: string | null;
  author: { id: number; username: string; displayName: string };
  board: { name: string; slug: string };
}

export function fetchAdminPosts(params: { status?: string; q?: string; page?: number }): Promise<{ total: number; items: AdminPostItem[] }> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.q) query.set('q', params.q);
  query.set('page', String(params.page ?? 1));
  return get(`/admin/posts?${query.toString()}`);
}

export function postAdminAction(id: number, action: string): Promise<{ id: number; status: string; isPinned: boolean; isFeatured: boolean }> {
  return post(`/admin/posts/${id}/action`, { action });
}

export interface AdminReportItem {
  id: number;
  targetType: 'POST' | 'COMMENT' | 'USER';
  targetId: number;
  reason: string;
  detail: string | null;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  handleNote: string | null;
  createdAt: string;
  handledAt: string | null;
  reporter: { id: number; displayName: string; username: string };
  handler: { displayName: string } | null;
  target: { label: string; status: string | null; deleted: boolean } | null;
}

export function fetchAdminReports(status: string, page = 1): Promise<{ total: number; items: AdminReportItem[] }> {
  return get(`/admin/reports?status=${status}&page=${page}`);
}

export function handleAdminReport(id: number, action: 'ACCEPTED' | 'REJECTED', handleNote?: string): Promise<{ id: number; status: string }> {
  return post(`/admin/reports/${id}/handle`, { action, handleNote });
}

export interface AuditLogItem {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  meta: unknown;
  ip: string | null;
  createdAt: string;
  actor: { displayName: string; username: string } | null;
}

export function fetchAuditLogs(page = 1): Promise<{ total: number; items: AuditLogItem[] }> {
  return get(`/admin/audit-logs?page=${page}`);
}

export function updateAdminBoard(id: number, payload: { name?: string; description?: string; order?: number; status?: string }) {
  return api.patch(`/admin/boards/${id}`, payload).then((r) => r.data.data);
}

export function createAdminTag(name: string, isOfficial = false) {
  return post('/admin/tags', { name, isOfficial });
}

export interface SensitiveWordItem {
  id: number;
  word: string;
  level: 'BLOCK' | 'REVIEW';
  createdAt: string;
}

export function fetchSensitiveWords(): Promise<SensitiveWordItem[]> {
  return get<SensitiveWordItem[]>('/admin/sensitive-words');
}

export function addSensitiveWord(word: string, level: 'BLOCK' | 'REVIEW'): Promise<SensitiveWordItem> {
  return post('/admin/sensitive-words', { word, level });
}

export function removeSensitiveWord(id: number): Promise<{ deleted: boolean }> {
  return api.delete(`/admin/sensitive-words/${id}`).then((r) => r.data.data);
}
