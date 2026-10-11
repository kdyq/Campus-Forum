// 校验规则（开发文档 §1.1 硬性约束，2026-10-11 确认；§1.4 已同步。前端在 frontend/src/utils/validators.ts 保持同源副本）
import { AppError, CODES } from './codes.ts';

export const USERNAME_RE = /^[A-Za-z0-9]{5,20}$/;
export const PASSWORD_RE = /^[A-Za-z0-9@_]{6,32}$/;
export const DISPLAY_NAME_RE = /^[\u4e00-\u9fa5A-Za-z0-9·\-_]{1,20}$/;

export const MSG = {
  USERNAME_SHORT: '用户名至少 5 位，只能使用英文字母和数字',
  USERNAME_CHARS: '用户名只能使用英文字母和数字，不能包含空格或符号',
  PASSWORD_SHORT: '密码至少 6 位',
  PASSWORD_CHARS: '密码只能使用英文字母、数字、@ 和 _',
  DISPLAY_NAME_CHARS: '昵称只能使用中文、英文字母、数字，以及 · 和 -',
} as const;

export function checkUsername(value: string): void {
  if (value.length < 5) throw new AppError(CODES.USERNAME_INVALID, MSG.USERNAME_SHORT);
  if (!USERNAME_RE.test(value)) throw new AppError(CODES.USERNAME_INVALID, MSG.USERNAME_CHARS);
}

export function checkPassword(value: string): void {
  if (value.length < 6) throw new AppError(CODES.PASSWORD_INVALID, MSG.PASSWORD_SHORT);
  if (!PASSWORD_RE.test(value)) throw new AppError(CODES.PASSWORD_INVALID, MSG.PASSWORD_CHARS);
}

export function checkDisplayName(value: string): void {
  if (!DISPLAY_NAME_RE.test(value)) throw new AppError(CODES.PARAM, MSG.DISPLAY_NAME_CHARS);
}

/** 邮箱域名是否命中白名单后缀（`.edu.cn` 命中任意 `*.edu.cn`） */
export function isEmailDomainAllowed(email: string, whitelist: readonly string[]): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  if (!domain) return false;
  return whitelist.some((entry) => {
    const e = entry.toLowerCase();
    return e.startsWith('.') ? domain.endsWith(e) : domain === e || domain.endsWith(`.${e}`);
  });
}
