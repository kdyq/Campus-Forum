// 发现域：搜索 / 热榜
import { get } from './client';

export interface SearchResultItem {
  id: number;
  title: string;
  excerpt: string | null;
  board: { id: number; name: string; slug: string };
  author: { id: number; username: string; displayName: string; avatarUrl: string | null } | null;
  isAnonymous: boolean;
  status: string;
  isPinned: boolean;
  isFeatured: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  hasAccepted: boolean;
  tags: { id: number; name: string; slug: string }[];
  createdAt: string;
  lastActivityAt: string;
  score: number;
}

export interface SearchParams {
  q: string;
  board?: string;
  page?: number;
  limit?: number;
}

export function search(params: SearchParams): Promise<{ items: SearchResultItem[]; total: number }> {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.board) query.set('board', params.board);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  return get(`/search?${query.toString()}`);
}

export interface HotItem {
  id: number;
  title: string;
  boardName: string;
  boardSlug: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  heat: number;
}

export function fetchHot(): Promise<HotItem[]> {
  return get<HotItem[]>('/hot');
}
