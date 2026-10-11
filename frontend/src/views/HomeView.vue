<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { get } from '@/api/client';
import { useSessionStore } from '@/stores/session';
import type { Board } from '@/types/api';

const session = useSessionStore();
const boards = ref<Board[]>([]);
const loading = ref(true);
const loadError = ref(false);

onMounted(async () => {
  try {
    boards.value = await get<Board[]>('/boards');
    loadError.value = false;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="page">
    <section class="panel hero">
      <h1 class="hero-title">同窗 · 校园话题社区</h1>
      <p class="hero-sub">发帖求助、交流课程、分享信息。注册受校园身份约束，内容有治理，讨论能沉淀。</p>
      <div v-if="!session.user" class="hero-actions">
        <RouterLink to="/register"><el-button type="primary">注册账号</el-button></RouterLink>
        <RouterLink to="/login"><el-button>登录</el-button></RouterLink>
      </div>
      <el-alert
        v-else-if="!session.user.emailVerified"
        class="verify-alert"
        type="warning"
        :closable="false"
        show-icon
        title="邮箱尚未验证"
        description="完成邮箱验证后才能发帖与评论，验证链接已发送至你的注册邮箱。"
      >
        <RouterLink :to="{ name: 'verify-email', query: { email: session.user.email } }">
          <el-button size="small" type="primary" plain>去验证</el-button>
        </RouterLink>
      </el-alert>
    </section>

    <section class="panel">
      <h2 class="panel-title">板块</h2>
      <div v-if="loading" class="loading-hint">正在加载板块…</div>
      <div v-else-if="loadError" class="empty-hint">
        板块加载失败，请稍后刷新重试
        <el-button size="small" text type="primary" @click="$router.go(0)">刷新</el-button>
      </div>
      <ul v-else class="board-list tw-hairline-list">
        <li v-for="b in boards" :key="b.id" class="board-item">
          <div class="board-head">
            <span class="board-name">{{ b.name }}</span>
            <el-tag size="small" effect="plain" round>{{ b.postCount }} 帖</el-tag>
          </div>
          <p class="board-desc">{{ b.description }}</p>
        </li>
      </ul>
    </section>

    <p class="footnote tw-meta">当前为第 1 步骨架：账号体系已可用；帖子流、详情与互动将在第 2 步开放。</p>
  </main>
</template>

<style scoped>
.page {
  max-width: var(--tw-page-max);
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: var(--tw-panel-pad);
}

.hero-title {
  margin: 4px 0 6px;
  font-size: var(--tw-fs-title-lg);
  line-height: var(--tw-lh-title-lg);
  font-weight: 600;
  color: var(--tw-ink);
}

.hero-sub {
  margin: 0;
  color: var(--tw-ink-2);
  font-size: var(--tw-fs-body);
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.verify-alert {
  margin-top: 14px;
  width: auto;
}

.verify-alert :deep(.el-alert__description) {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
}

.panel-title {
  margin: 2px 0 10px;
  font-size: var(--tw-fs-label);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--tw-ink-2);
}

.loading-hint,
.empty-hint {
  padding: 24px 0;
  text-align: center;
  color: var(--tw-ink-3);
  font-size: var(--tw-fs-body-sm);
}

.board-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.board-item {
  padding: 12px 4px;
}

.board-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.board-name {
  font-weight: 600;
  color: var(--tw-ink);
  font-size: var(--tw-fs-title);
  line-height: var(--tw-lh-title);
}

.board-desc {
  margin: 3px 0 0;
  color: var(--tw-ink-2);
  font-size: var(--tw-fs-caption);
  line-height: var(--tw-lh-caption);
}

.footnote {
  text-align: center;
  margin: 10px 0 0;
}
</style>
