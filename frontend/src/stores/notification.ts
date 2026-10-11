// 通知状态：未读数 + Socket.IO 实时推送监听
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/client';
import { useSessionStore } from '@/stores/session';

export const useNotificationStore = defineStore('notification', () => {
  const unread = ref(0);
  let socket: ReturnType<typeof import('socket.io-client')['io']> | null = null;
  let connectedFor: number | null = null;

  async function refresh(): Promise<void> {
    try {
      const { data } = await api.get('/notifications/unread-count');
      unread.value = data?.data?.count ?? 0;
    } catch {
      /* 未登录等场景忽略 */
    }
  }

  async function connect(): Promise<void> {
    const session = useSessionStore();
    if (!session.user) return;
    if (connectedFor === session.user.id && socket?.connected) return;
    disconnect();
    const { io } = await import('socket.io-client');
    socket = io('/', {
      path: '/socket.io',
      auth: { token: session.accessToken },
      reconnectionAttempts: 3,
    });
    socket.on('notification', () => {
      unread.value += 1;
    });
    socket.on('connect_error', () => {
      /* 静默重试 */
    });
    connectedFor = session.user.id;
  }

  function disconnect(): void {
    socket?.disconnect();
    socket = null;
    connectedFor = null;
  }

  function reset(): void {
    unread.value = 0;
    disconnect();
  }

  return { unread, refresh, connect, disconnect, reset };
});
