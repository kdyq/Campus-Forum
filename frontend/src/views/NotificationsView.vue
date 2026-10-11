<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { api } from '@/api/client';
import { useNotificationStore } from '@/stores/notification';
import { timeAgo } from '@/utils/format';

interface NotificationItem {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

const store = useNotificationStore();
const items = ref<NotificationItem[]>([]);
const total = ref(0);
const unreadCount = ref(0);
const filter = ref<string>('');
const page = ref(1);
const loading = ref(true);

const FILTERS = [
  { value: '', label: '全部' },
  { value: 'REPLY', label: '回复' },
  { value: 'SUB_REPLY', label: '楼中楼' },
  { value: 'LIKE', label: '点赞' },
  { value: 'BOOKMARK', label: '收藏' },
  { value: 'ACCEPTED', label: '采纳' },
  { value: 'FOLLOW', label: '关注' },
  { value: 'MODERATION', label: '治理' },
];

const TYPE_LABELS: Record<string, string> = {
  REPLY: '收到回复',
  SUB_REPLY: '楼中楼回复',
  MENTION: '提到我',
  LIKE: '收到点赞',
  BOOKMARK: '被收藏',
  ACCEPTED: '答案被采纳',
  FOLLOW: '新的关注',
  SYSTEM: '系统消息',
  MODERATION: '治理通知',
};

function describe(n: NotificationItem): { text: string; link: { name: string; params?: Record<string, string>; query?: Record<string, string> } | null } {
  const p = n.payload;
  switch (n.type) {
    case 'REPLY':
      return { text: `你的帖子「${p.postTitle ?? ''}」有了新回复`, link: { name: 'post-detail', params: { id: String(p.postId) } } };
    case 'SUB_REPLY':
      return { text: `「${p.postTitle ?? ''}」的评论有了新回复`, link: { name: 'post-detail', params: { id: String(p.postId) } } };
    case 'LIKE':
      return { text: `有人赞了你的${p.commentId ? '评论' : '帖子'}「${p.postTitle ?? ''}」`, link: { name: 'post-detail', params: { id: String(p.postId) } } };
    case 'BOOKMARK':
      return { text: `有人收藏了你的帖子「${p.postTitle ?? ''}」`, link: { name: 'post-detail', params: { id: String(p.postId) } } };
    case 'ACCEPTED':
      return { text: `你在「${p.postTitle ?? ''}」的回答被采纳为最佳答案`, link: { name: 'post-detail', params: { id: String(p.postId) } } };
    case 'FOLLOW':
      return { text: `${p.followerName ?? '有人'} 关注了你`, link: { name: 'user', params: { username: String(p.username ?? '') } } };
    case 'MODERATION':
      return {
        text: p.result === 'ACCEPTED' ? '你的举报已受理，相关内容已被处理' : '你的举报已复核，内容暂无违规',
        link: null,
      };
    default:
      return { text: '系统消息', link: null };
  }
}

async function load() {
  loading.value = true;
  try {
    const query = new URLSearchParams();
    if (filter.value) query.set('type', filter.value);
    query.set('page', String(page.value));
    const { data } = await api.get(`/notifications?${query.toString()}`);
    items.value = data?.data?.items ?? [];
    total.value = data?.data?.total ?? 0;
    unreadCount.value = data?.data?.unreadCount ?? 0;
  } catch {
    ElMessage.error('通知加载失败');
  } finally {
    loading.value = false;
  }
}

async function markAll() {
  try {
    const { data } = await api.post('/notifications/read', { all: true });
    unreadCount.value = data?.data?.count ?? 0;
    items.value = items.value.map((n) => ({ ...n, isRead: true }));
    await store.refresh();
    ElMessage.success('已全部标记为已读');
  } catch {
    ElMessage.error('操作失败');
  }
}

const shown = computed(() =>
  items.value.map((n) => {
    const d = describe(n);
    return { ...n, text: d.text, link: d.link };
  }),
);

watch(filter, () => {
  page.value = 1;
  void load();
});
onMounted(() => {
  void load();
  void store.refresh();
});
</script>

<template>
  <main class="page">
    <section class="panel">
      <div class="head-row">
        <h1 class="page-title">消息通知</h1>
        <div class="head-actions">
          <span class="tw-meta">未读 {{ unreadCount }}</span>
          <el-button size="small" :disabled="unreadCount === 0" @click="markAll">全部已读</el-button>
        </div>
      </div>

      <div class="filters" role="tablist" aria-label="通知类型筛选">
        <button
          v-for="f in FILTERS"
          :key="f.value"
          type="button"
          role="tab"
          class="filter-chip"
          :class="{ on: filter === f.value }"
          :aria-selected="filter === f.value"
          @click="filter = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <p v-if="loading" class="loading-hint">加载中…</p>
      <template v-else>
        <ul class="notif-list tw-hairline-list">
          <li v-for="n in shown" :key="n.id" class="notif-item" :class="{ unread: !n.isRead }">
            <component
              :is="n.link ? 'RouterLink' : 'div'"
              :to="n.link ?? undefined"
              class="notif-link"
            >
              <span class="notif-type" :data-type="n.type">{{ TYPE_LABELS[n.type] ?? n.type }}</span>
              <span class="notif-text">{{ n.text }}</span>
              <span class="notif-time tw-meta">{{ timeAgo(n.createdAt) }}</span>
              <span v-if="!n.isRead" class="unread-dot" aria-hidden="true"></span>
            </component>
          </li>
        </ul>
        <p v-if="items.length === 0" class="empty-hint">暂时没有新消息</p>
        <el-pagination
          v-if="total > 20"
          class="pager"
          layout="prev, pager, next"
          :total="total"
          :page-size="20"
          :current-page="page"
          @current-change="(p: number) => { page = p; load(); }"
        />
      </template>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 22px 26px;
}

.head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.page-title {
  margin: 0;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.filter-chip {
  height: 28px;
  padding: 0 12px;
  border-radius: var(--tw-r-pill);
  font-size: 12.5px;
  color: var(--tw-ink-2);
  background: transparent;
  transition: all var(--tw-dur-fast) var(--tw-ease-out);
}

.filter-chip:hover {
  background: var(--tw-surface-2);
  color: var(--tw-ink);
}

.filter-chip.on {
  background: var(--tw-surface);
  color: var(--tw-accent);
  font-weight: 600;
  box-shadow: var(--tw-e1);
}

.notif-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notif-item.unread {
  background: var(--tw-accent-soft);
}

.notif-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 12px;
}

.notif-type {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--tw-accent-ink);
  background: var(--tw-accent-soft);
  border-radius: var(--tw-r-badge);
  padding: 2px 8px;
}

.notif-item.unread .notif-type {
  background: var(--tw-surface);
}

.notif-text {
  flex: 1;
  min-width: 0;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notif-time {
  flex: none;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--tw-r-full);
  background: var(--tw-danger);
  flex: none;
}

.loading-hint,
.empty-hint {
  text-align: center;
  color: var(--tw-ink-3);
  padding: 32px 0;
  font-size: var(--tw-fs-body-sm);
}
</style>
