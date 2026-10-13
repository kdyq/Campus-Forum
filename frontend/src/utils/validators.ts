// 校验规则（项目规范 §1.1 硬性约束，2026-10-11 确认；服务端仍会重复校验）
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

type Callback = (error?: Error) => void;

export function usernameValidator(_rule: unknown, value: string | undefined, callback: Callback): void {
  const v = (value ?? '').trim();
  if (!v) return callback(new Error('请输入用户名'));
  if (v.length < 5) return callback(new Error(MSG.USERNAME_SHORT));
  if (!USERNAME_RE.test(v)) return callback(new Error(MSG.USERNAME_CHARS));
  callback();
}

export function passwordValidator(_rule: unknown, value: string | undefined, callback: Callback): void {
  const v = value ?? '';
  if (!v) return callback(new Error('请输入密码'));
  if (v.length < 6) return callback(new Error(MSG.PASSWORD_SHORT));
  if (!PASSWORD_RE.test(v)) return callback(new Error(MSG.PASSWORD_CHARS));
  callback();
}

export function displayNameValidator(_rule: unknown, value: string | undefined, callback: Callback): void {
  const v = (value ?? '').trim();
  if (!v) return callback(new Error('请输入昵称'));
  if (!DISPLAY_NAME_RE.test(v)) return callback(new Error(MSG.DISPLAY_NAME_CHARS));
  callback();
}

/** 是否为教育邮箱（.edu.cn 及其子域） */
export function isEduEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return domain === 'edu.cn' || domain.endsWith('.edu.cn');
}
