import type { Prisma, User } from '@prisma/client';

/** 对外暴露的用户字段（不含密码哈希等敏感信息） */
export const safeUserSelect = {
  id: true,
  username: true,
  displayName: true,
  email: true,
  emailVerified: true,
  avatarUrl: true,
  bio: true,
  college: true,
  grade: true,
  major: true,
  role: true,
  level: true,
  exp: true,
  status: true,
  mutedUntil: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

/** 从完整 User 行中裁剪出对外安全字段 */
export function pickSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email,
    emailVerified: user.emailVerified,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    college: user.college,
    grade: user.grade,
    major: user.major,
    role: user.role,
    level: user.level,
    exp: user.exp,
    status: user.status,
    mutedUntil: user.mutedUntil,
    createdAt: user.createdAt,
  };
}
