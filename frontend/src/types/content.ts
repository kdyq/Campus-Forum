import type { SafeUser } from './api';

export interface FeedAuthor {
  id: number;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedTag {
  id: number;
  name: string;
  slug: string;
}

export interface FeedItem {
  id: number;
  title: string;
  excerpt: string | null;
  board: { id: number; name: string; slug: string };
  author: FeedAuthor | null;
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
  tags: FeedTag[];
  createdAt: string;
  lastActivityAt: string;
  viewerLiked: boolean;
  viewerBookmarked: boolean;
}

export interface FeedResult {
  items: FeedItem[];
  nextCursor: string | null;
  total?: number;
}

export interface PostDetail extends FeedItem {
  content: string;
  editedAt: string | null;
  editCount: number;
  courseId: number | null;
  poll: {
    id: number;
    question: string;
    multiple: boolean;
    closed: boolean;
    closesAt: string | null;
    options: { id: number; text: string; count: number; percent: number }[];
    totalVotes: number;
    myChoices: number[];
  } | null;
  course: { id: number; name: string; code: string; teacher: string | null; department: string | null } | null;
  acceptedComment: {
    id: number;
    content: string;
    createdAt: string;
    author: SafeUser | null;
    isAnonymous: boolean;
  } | null;
  authorVisible: boolean;
  authorSafe: SafeUser | null;
}

export interface CommentAuthor {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  level: number;
  exp: number;
}

export interface CommentNode {
  id: number;
  content: string;
  status: string;
  isAnonymous: boolean;
  likeCount: number;
  createdAt: string;
  isTop: boolean;
  author: CommentAuthor | null;
  replyToUser: { id: number; displayName: string } | null;
  deleted: boolean;
  likeByViewer: boolean;
  replies: CommentNode[];
}

export interface TagItem {
  id: number;
  name: string;
  slug: string;
  postCount: number;
  isOfficial: boolean;
}

export interface BoardItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  postCount: number;
}

export interface SiteStats {
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  todayPosts: number;
  activeAnswerers: {
    id: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    acceptedCount: number;
  }[];
}

export interface Draft {
  id: number;
  boardId: number | null;
  title: string | null;
  content: string | null;
  updatedAt: string;
}

export interface BookmarkList {
  folders: { id: number | null; name: string; order: number }[];
  items: {
    folderId: number | null;
    savedAt: string;
    post: {
      id: number;
      title: string;
      excerpt: string | null;
      status: string;
      likeCount: number;
      commentCount: number;
      createdAt: string;
      board: { name: string; slug: string };
      author: { displayName: string };
    };
  }[];
}
