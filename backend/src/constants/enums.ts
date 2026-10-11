// 状态枚举常量：以 as-const 对象代替 enum（Node 原生 TS 运行约束）
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MODERATOR: 'MODERATOR',
  USER: 'USER',
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  MUTED: 'MUTED',
  BANNED: 'BANNED',
} as const;

export const POST_STATUS = {
  NORMAL: 'NORMAL',
  SOLVED: 'SOLVED',
  LOCKED: 'LOCKED',
  PENDING: 'PENDING',
  REMOVED: 'REMOVED',
} as const;
export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

export const CODE_SCENES = {
  REGISTER: 'REGISTER',
  RESET: 'RESET',
} as const;
