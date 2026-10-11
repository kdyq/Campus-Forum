<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import BoardTree from '@/components/BoardTree.vue';
import EmptyState from '@/components/EmptyState.vue';
import PostItem from '@/components/PostItem.vue';
import PostSkeleton from '@/components/PostSkeleton.vue';
import SortBar from '@/components/SortBar.vue';
import { fetchBoards, fetchFeed, fetchStats } from '@/api/content';
import { useEntrance } from '@/composables/useEntrance';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import { useSessionStore } from '@/stores/session';
import type { BoardItem, FeedItem, SiteStats } from '@/types/content';

const route = useRoute();
const session = useSessionStore();
const rootRef = ref<HTMLElement | null>(null);

useEntrance(rootRef, {
  tree: '.col-left',
  sortbar: '.sortbar',
  items: '.post',
  panels: '.rail .panel',
});

const boardSlug = computed(() => (route.params.slug as string) ?? '');
const sort = ref<'latest' | 'hot' | 'featured'>('latest');

const boards = ref<BoardItem[]>([]);
const stats = ref<SiteStats | null>(null);
const items = ref<FeedItem[]>([]);
const loading = ref(true);
const loadingMore = ref(false);
const loadError = ref(false);
const cursor = ref<string | null>(null);
const finished = ref(false);

const SORT_OPTIONS = [
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '热门' },
  { value: 'featured', label: '精华' },
];

const { sentinelRef } = useInfiniteScroll(() => {
  void loadMore();
});

async function loadBoards() {
  try {
    boards.value = await fetchBoards();
  } catch {
    /* 板块加载失败不阻塞信息流 */
  }
}

async function loadStats() {
  try {
    stats.value = await fetchStats();
  } catch {
    /* 忽略 */
  }
}

async function reset() {
  loading.value = true;
  loadError.value = false;
  finished.value = false;
  items.value = [];
  cursor.value = null;
  try {
    const result = await fetchFeed({
      board: boardSlug.value || undefined,
      sort: sort.value,
      limit: 20,
    });
    items.value = result.items;
    cursor.value = result.nextCursor;
    finished.value = result.nextCursor === null;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (finished.value || loadingMore.value || loading.value || !cursor.value) return;
  loadingMore.value = true;
  try {
    const result = await fetchFeed({
      board: boardSlug.value || undefined,
      sort: sort.value,
      limit: 20,
      cursor: cursor.value,
    });
    items.value = [...items.value, ...result.items];
    cursor.value = result.nextCursor;
    finished.value = result.nextCursor === null;
  } catch {
    ElMessage.error('加载更多失败，请重试');
  } finally {
    loadingMore.value = false;
  }
}

watch([boardSlug, sort], () => {
  void reset();
});

onMounted(() => {
  void loadBoards();
  void loadStats();
  void reset();
});

const activeBoard = computed(() => boards.value.find((b) => b.slug === boardSlug.value));
</script>

<template>
  <div ref="rootRef" class="shell">
    <aside class="col-left">
      <BoardTree :boards="boards" :active-slug="boardSlug" />
    </aside>

    <main class="col-main">
      <SortBar v-model="sort" :options="SORT_OPTIONS">
        <span class="count tw-meta">
          {{ activeBoard ? `${activeBoard.name} · ${activeBoard.postCount} 帖` : '' }}
        </span>
      </SortBar>

      <div v-if="loading" class="feed">
        <PostSkeleton :rows="6" />
      </div>
      <div v-else-if="loadError" class="feed error-block">
        <EmptyState icon="⚠" title="帖子加载失败" description="网络似乎出了点问题">
          <template #actions>
            <el-button type="primary" @click="reset">重新加载</el-button>
          </template>
        </EmptyState>
      </div>
      <template v-else>
        <div class="feed">
          <PostItem v-for="item in items" :key="item.id" :item="item" />
          <EmptyState
            v-if="items.length === 0"
            icon="✎"
            :title="activeBoard ? `「${activeBoard.name}」板块还没有帖子` : '还没有任何帖子'"
            :description="session.user ? '来发第一帖，让讨论开始吧' : '登录并完成邮箱验证后即可发帖'"
          >
            <template #actions>
              <RouterLink v-if="session.user?.emailVerified" to="/p/new"><el-button type="primary">发第一帖</el-button></RouterLink>
              <RouterLink v-else-if="session.user" to="/verify-email"><el-button type="primary">去验证邮箱</el-button></RouterLink>
              <RouterLink v-else to="/login"><el-button type="primary">去登录</el-button></RouterLink>
            </template>
          </EmptyState>
        </div>
        <div ref="sentinelRef" class="sentinel"></div>
        <p v-if="loadingMore" class="list-foot tw-meta">正在加载…</p>
        <p v-else-if="finished && items.length > 0" class="list-foot tw-meta">没有更多了</p>
      </template>
    </main>

    <aside class="col-right rail">
      <section class="panel">
        <h3 class="panel-title">社区数据</h3>
        <ul v-if="stats" class="stat-list">
          <li><span class="stat-num">{{ stats.totalPosts }}</span><span class="stat-label">帖子</span></li>
          <li><span class="stat-num">{{ stats.totalComments }}</span><span class="stat-label">评论</span></li>
          <li><span class="stat-num">{{ stats.todayPosts }}</span><span class="stat-label">今日新帖</span></li>
          <li><span class="stat-num">{{ stats.totalUsers }}</span><span class="stat-label">同窗</span></li>
        </ul>
        <p v-else class="stat-empty">加载中…</p>
      </section>
      <section class="panel">
        <h3 class="panel-title">活跃答主</h3>
        <ul v-if="stats && stats.activeAnswerers.length > 0" class="answerer-list">
          <li v-for="(u, i) in stats.activeAnswerers" :key="u.id" class="answerer">
            <span class="rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
            <RouterLink :to="{ name: 'user', params: { username: u.username } }" class="answerer-name">{{ u.displayName }}</RouterLink>
            <span class="tw-meta">采纳 {{ u.acceptedCount }}</span>
          </li>
        </ul>
        <p v-else class="stat-empty">暂无数据，去回答第一个问题</p>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.shell {
  max-width: var(--tw-page-max);
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: grid;
  grid-template-columns: var(--tw-col-left) minmax(0, 1fr) var(--tw-col-right);
  gap: var(--tw-col-gap);
  align-items: start;
}

.col-left {
  position: sticky;
  top: var(--tw-sticky-top);
}

.col-right.rail {
  position: sticky;
  top: var(--tw-sticky-top);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feed {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  overflow: hidden;
  min-height: 200px;
}

.error-block {
  background: transparent;
  border: none;
}

.count {
  font-size: 12px;
}

.sentinel {
  height: 1px;
}

.list-foot {
  text-align: center;
  padding: 24px 0;
  font-size: 12.5px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: var(--tw-panel-pad);
}

.panel-title {
  margin: 2px 0 11px;
  font-size: var(--tw-fs-label);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--tw-ink-2);
}

.stat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-num {
  font-family: var(--tw-font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--tw-ink);
}

.stat-label {
  font-size: 11.5px;
  color: var(--tw-ink-3);
}

.stat-empty {
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-3);
  margin: 0;
}

.answerer-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.answerer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 7px;
  font-size: var(--tw-fs-body-sm);
}

.answerer:hover {
  background: var(--tw-surface-2);
}

.rank {
  font-family: var(--tw-font-mono);
  font-size: 12.5px;
  color: var(--tw-ink-3);
  width: 16px;
  text-align: center;
}

.rank.top {
  color: var(--tw-accent);
  font-weight: 600;
}

.answerer-name {
  color: var(--tw-ink);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.answerer-name:hover {
  color: var(--tw-accent-ink);
}

/* 响应式：1180 以下隐藏右栏，860 以下单栏 */
@media (max-width: 1180px) {
  .col-right.rail {
    display: none;
  }
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
    padding: 16px 18px 60px;
  }

  .col-left {
    position: static;
  }

  /* 板块树变横向可滑胶囊组（设计规范 §2.9） */
  .col-left :deep(.navcard) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    padding: 8px;
  }

  .col-left :deep(.nav-h),
  .col-left :deep(.nav-div) {
    display: none;
  }

  .col-left :deep(.nav-i) {
    flex: none;
    height: 32px;
  }

  .col-left :deep(.cnt) {
    display: none;
  }
}
</style>
