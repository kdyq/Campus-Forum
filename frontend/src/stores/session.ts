// 会话状态：access token 只存内存，恢复依赖 httpOnly Cookie 的 refresh
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { post } from '@/api/client';
import type { LoginResult, SafeUser } from '@/types/api';

export const useSessionStore = defineStore('session', () => {
  const user = ref<SafeUser | null>(null);
  const accessToken = ref<string | null>(null);

  let ensurePromise: Promise<void> | null = null;

  function setSession(u: SafeUser, token: string): void {
    user.value = u;
    accessToken.value = token;
  }

  function resetLocal(): void {
    user.value = null;
    accessToken.value = null;
  }

  async function login(identifier: string, password: string): Promise<void> {
    const result = await post<LoginResult>('/auth/login', { identifier, password });
    setSession(result.user, result.accessToken);
  }

  async function refreshSession(): Promise<void> {
    const result = await post<LoginResult>('/auth/refresh', null);
    setSession(result.user, result.accessToken);
  }

  /** 应用启动时用 Cookie 恢复会话；整个生命周期只尝试一次 */
  function ensureLoaded(): Promise<void> {
    ensurePromise ??= (async () => {
      if (accessToken.value || user.value) return;
      try {
        await refreshSession();
      } catch {
        resetLocal();
      }
    })();
    return ensurePromise;
  }

  async function logout(): Promise<void> {
    try {
      await post('/auth/logout', null);
    } finally {
      resetLocal();
    }
  }

  return { user, accessToken, setSession, resetLocal, login, refreshSession, ensureLoaded, logout };
});
