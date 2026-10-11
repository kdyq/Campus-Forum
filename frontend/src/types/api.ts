// 与后端约定的响应包络与共享类型（开发文档 §4.1）
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface SafeUser {
  id: number;
  username: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  college: string | null;
  grade: string | null;
  major: string | null;
  role: string;
  level: number;
  exp: number;
  status: string;
  mutedUntil: string | null;
  createdAt: string;
}

export interface Board {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  postCount: number;
}

export interface LoginResult {
  accessToken: string;
  user: SafeUser;
}

export interface RegisterResult {
  id: number;
  username: string;
  email: string;
  needsEmailVerification: true;
}
