// 内容域接口封装
import { get, post, api } from './client';
import type {
  BoardItem,
  BookmarkList,
  CommentNode,
  Draft,
  FeedResult,
  PostDetail,
  SiteStats,
  TagItem,
} from '@/types/content';

export interface FeedQuery {
  board?: string;
  sort?: 'latest' | 'hot' | 'featured';
  tag?: string;
  courseId?: number;
  author?: number;
  cursor?: string;
  page?: number;
  limit?: number;
}

export function fetchFeed(query: FeedQuery): Promise<FeedResult> {
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params[k] = String(v);
  }
  return get<FeedResult>('/posts', { params });
}

export function fetchPost(id: number): Promise<PostDetail> {
  return get<PostDetail>(`/posts/${id}`);
}

export interface CreatePostPayload {
  boardId: number;
  title: string;
  content: string;
  isAnonymous: boolean;
  tagIds: number[];
  courseId?: number | null;
}

export function createPost(payload: CreatePostPayload): Promise<{ id: number }> {
  return post('/posts', payload);
}

export function updatePost(
  id: number,
  payload: Partial<Omit<CreatePostPayload, 'courseId'>> & { courseId?: number | null },
): Promise<{ id: number; revisionSaved: boolean }> {
  return api.patch(`/posts/${id}`, payload).then((r) => r.data.data);
}

export function deletePost(id: number): Promise<{ deleted: boolean }> {
  return api.delete(`/posts/${id}`).then((r) => r.data.data);
}

export function acceptComment(postId: number, commentId: number): Promise<{ accepted: boolean }> {
  return post(`/posts/${postId}/accept`, { commentId });
}

export function fetchComments(postId: number): Promise<CommentNode[]> {
  return get<CommentNode[]>(`/posts/${postId}/comments`);
}

export function createComment(
  postId: number,
  payload: { content: string; isAnonymous: boolean; parentId?: number | null; replyToUserId?: number | null },
): Promise<{ id: number }> {
  return post(`/posts/${postId}/comments`, payload);
}

export function deleteComment(id: number): Promise<{ deleted: boolean }> {
  return api.delete(`/comments/${id}`).then((r) => r.data.data);
}

export function toggleLike(targetType: 'POST' | 'COMMENT', targetId: number): Promise<{ liked: boolean; likeCount: number }> {
  return post('/likes', { targetType, targetId });
}

export function untoggleLike(targetType: 'POST' | 'COMMENT', targetId: number): Promise<{ liked: boolean; likeCount: number }> {
  return api.delete(`/likes/${targetType}/${targetId}`).then((r) => r.data.data);
}

export function addBookmark(postId: number, folderId: number | null = null): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  return post('/bookmarks', { postId, folderId });
}

export function removeBookmark(postId: number): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  return api.delete(`/bookmarks/${postId}`).then((r) => r.data.data);
}

export function fetchBookmarks(): Promise<BookmarkList> {
  return get<BookmarkList>('/bookmarks');
}

export function fetchBoards(): Promise<BoardItem[]> {
  return get<BoardItem[]>('/boards');
}

export function fetchTags(): Promise<TagItem[]> {
  return get<TagItem[]>('/tags');
}

export function fetchStats(): Promise<SiteStats> {
  return get<SiteStats>('/stats');
}

export function fetchDraft(): Promise<Draft | null> {
  return get<Draft | null>('/draft');
}

export function saveDraft(payload: { boardId?: number | null; title?: string | null; content?: string | null }): Promise<{ updatedAt: string }> {
  return api.put('/draft', payload).then((r) => r.data.data);
}

export function clearDraft(): Promise<{ cleared: boolean }> {
  return api.delete('/draft').then((r) => r.data.data);
}

export function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  return post<{ url: string }>('/uploads/image', fd).then((r) => r.url);
}
