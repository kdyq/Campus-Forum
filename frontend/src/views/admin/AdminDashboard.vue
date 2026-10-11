<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchAdminStats, type AdminStats } from '@/api/admin';

const stats = ref<AdminStats | null>(null);
const loading = ref(true);

const CARDS: { key: keyof AdminStats; label: string; hint?: string; warn?: boolean }[] = [
  { key: 'totalPosts', label: '帖子总数' },
  { key: 'totalComments', label: '评论总数' },
  { key: 'totalUsers', label: '注册用户' },
  { key: 'todayPosts', label: '今日新帖' },
  { key: 'pendingPosts', label: '待审核帖子', hint: '新账号沙箱与敏感内容', warn: true },
  { key: 'pendingReports', label: '待处理举报', hint: '需要尽快跟进', warn: true },
  { key: 'activeMutes', label: '生效中的禁言' },
];

onMounted(async () => {
  try {
    stats.value = await fetchAdminStats();
  } catch {
    ElMessage.error('看板数据加载失败');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div v-loading="loading">
    <h2 class="page-h">数据看板</h2>
    <div class="stat-grid">
      <div v-for="card in CARDS" :key="card.key" class="stat-card" :class="{ warn: card.warn && stats?.[card.key] }">
        <p class="stat-label">
          {{ card.label }}
          <el-tooltip v-if="card.hint" :content="card.hint"><span class="hint-dot">·</span></el-tooltip>
        </p>
        <p class="stat-value">{{ stats?.[card.key] ?? '—' }}</p>
      </div>
    </div>

    <div v-if="stats && (stats.pendingPosts > 0 || stats.pendingReports > 0)" class="todo-box">
      <p class="todo-title">待办提醒</p>
      <p v-if="stats.pendingPosts > 0" class="todo-item">
        有 {{ stats.pendingPosts }} 个帖子待审核（新账号沙箱 / 敏感词待审），前往
        <RouterLink to="/admin/posts?status=PENDING">内容管理</RouterLink> 处理
      </p>
      <p v-if="stats.pendingReports > 0" class="todo-item">
        有 {{ stats.pendingReports }} 个举报待处理，前往
        <RouterLink to="/admin/reports">举报队列</RouterLink> 处理
      </p>
    </div>
  </div>
</template>

<style scoped>
.page-h {
  margin: 0 0 18px;
  font-size: var(--tw-fs-title-lg);
  color: var(--tw-ink);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.stat-card {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 16px 18px;
}

.stat-card.warn {
  border-color: var(--tw-warning);
}

.stat-label {
  margin: 0;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
}

.hint-dot {
  cursor: help;
  color: var(--tw-ink-3);
}

.stat-value {
  margin: 6px 0 0;
  font-family: var(--tw-font-mono);
  font-size: 26px;
  font-weight: 600;
  color: var(--tw-ink);
}

.todo-box {
  margin-top: 20px;
  background: var(--tw-warning-soft);
  border: 1px solid var(--tw-warning);
  border-radius: var(--tw-r-card);
  padding: 14px 18px;
}

.todo-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--tw-warning);
  font-size: var(--tw-fs-body-sm);
}

.todo-item {
  margin: 0;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
}

.todo-item a {
  color: var(--tw-accent);
  font-weight: 500;
}
</style>
