// 接口封装：统一包络解析、401 静默刷新、业务错误归一
import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import type { ApiResponse, LoginResult, SafeUser } from '@/types/api';

export class ApiError extends Error {
  readonly code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export const api = axios.create({ baseURL: '/api', withCredentials: true, timeout: 15000 });

api.interceptors.request.use(async (config) => {
  const { useSessionStore } = await import('@/stores/session');
  const session = useSessionStore();
  if (session.accessToken) config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  return config;
});

let refreshing: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
  try {
    const { data } = await api.post<ApiResponse<LoginResult>>('/auth/refresh', null);
    if (data.code !== 0) return null;
    const { useSessionStore } = await import('@/stores/session');
    useSessionStore().setSession(data.data.user, data.data.accessToken);
    return data.data.accessToken;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (resp) => {
    const body = resp.data as ApiResponse<unknown> | undefined;
    if (body && typeof body === 'object' && 'code' in body && body.code !== 0) {
      return Promise.reject(new ApiError(body.code, body.message));
    }
    return resp;
  },
  async (error: AxiosError<ApiResponse<unknown>>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const bodyCode = error.response?.data?.code;
    const isRefreshCall = typeof original?.url === 'string' && original.url.includes('/auth/refresh');

    // 401：先尝试静默刷新一次，成功则重放原请求
    if ((status === 401 || bodyCode === 10002) && original && !isRefreshCall && !original._retried) {
      original._retried = true;
      refreshing ??= tryRefresh();
      const token = await refreshing;
      refreshing = null;
      if (token) {
        (original.headers as Record<string, unknown>)['Authorization'] = `Bearer ${token}`;
        return api.request(original);
      }
      const { useSessionStore } = await import('@/stores/session');
      useSessionStore().resetLocal();
    }

    if (error instanceof ApiError) throw error;
    if (bodyCode !== undefined && bodyCode !== null) {
      throw new ApiError(bodyCode, error.response?.data?.message ?? '请求失败');
    }
    if (error.code === 'ECONNABORTED') throw new ApiError(-1, '请求超时，请稍后重试');
    throw new ApiError(-1, '网络异常，请稍后重试');
  },
);

export async function post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const resp = await api.post<ApiResponse<T>>(url, body ?? undefined, config);
  return resp.data.data;
}

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const resp = await api.get<ApiResponse<T>>(url, config);
  return resp.data.data;
}

export type { SafeUser };
