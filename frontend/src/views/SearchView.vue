<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BoardTree from '@/components/BoardTree.vue';
import EmptyState from '@/components/EmptyState.vue';
import PostItem from '@/components/PostItem.vue';
import PostSkeleton from '@/components/PostSkeleton.vue';
import SortBar from '@/components/SortBar.vue';
import { search, type SearchResultItem } from '@/api/discover';
import { fetchBoards } from '@/api/content';
import { timeAgo, formatCount } from '@/utils/format';
import type { BoardItem } from '@/types/content';

const HISTORY_KEY = 'tongchuang:search-history';
const route = useRoute();
const router = useRouter();

const keyword = ref(String(route.query.q ?? ''));
const boardFilter = ref('');
const boards = ref<BoardItem[]>([]);
const items = ref<SearchResultItem[]>([]);
const total = ref(0);
const loading = ref(true);
const searched = ref(false);
const history = ref<string[]>(loadHistory());

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function pushHistory(word: string): void {
  history.value = [word, ...history.value.filter((h) => h !== word)].slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}

function clearHistory(): void {
  history.value = [];
  localStorage.removeItem(HISTORY_KEY);
}

async function doSearch(word = keyword.value.trim()) {
  if (!word) return;
  keyword.value = word;
  pushHistory(word);
  if (route.query.q !== word || route.query.board !== boardFilter.value) {
    await router.replace({ query: { q: word, board: boardFilter.value || undefined } });
  }
  loading.value = true;
  searched.value = true;
  try {
    const result = await search({ q: word, board: boardFilter.value || undefined });
    items.value = result.items;
    total.value = result.total;
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '搜索失败');
  } finally {
    loading.value = false;
  }
}

watch(boardFilter, () => {
  if (searched.value && keyword.value) void doSearch();
});

watch(
  () => route.query.q,
  (q) => {
    if (typeof q === 'string' && q && q !== keyword.value) {
      keyword.value = q;
      void doSearch(q);
    }
  },
);

onMounted(async () => {
  try {
    boards.value = await fetchBoards();
  } catch {
    /* 忽略 */
  }
  if (keyword.value) await doSearch();
});
</script>

<template>
  <div class="search-shell">
    <main class="col-main">
      <section class="panel search-box">
        <div class="search-row">
          <el-input
            v-model="keyword"
            class="search-input"
            placeholder="搜索帖子标题与正文…"
            clearable
            @keyup.enter="doSearch()"
          />
          <el-button type="primary" @click="doSearch()">搜索</el-button>
        </div>
        <div class="filter-row">
          <span class="filter-label">板块</span>
          <el-radio-group v-model="boardFilter" size="small">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button v-for="b in boards" :key="b.id" :value="b.slug">{{ b.name }}</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="history.length > 0 && !searched" class="history-row">
          <span class="filter-label">最近搜索</span>
          <button v-for="h in history" :key="h" type="button" class="history-chip" @click="doSearch(h)">{{ h }}</button>
          <button type="button" class="history-clear" @click="clearHistory">清空</button>
        </div>
      </section>

      <div v-if="loading" class="feed">
        <PostSkeleton :rows="4" />
      </div>
      <template v-else-if="searched">
        <p class="result-count tw-meta">找到 {{ total }} 条与「{{ keyword }}」相关的帖子</p>
        <div v-if="items.length > 0" class="feed">
          <article v-for="item in items" :key="item.id" class="result-item">
            <RouterLink :to="{ name: 'post-detail', params: { id: item.id } }" class="result-link">
              <div class="result-head">
                <span class="result-title">{{ item.title }}</span>
                <span v-if="item.isPinned" class="flag mini">置顶</span>
                <span v-if="item.isFeatured" class="flag mini">精华</span>
                <span v-if="item.hasAccepted" class="flag mini solved">已解决</span>
              </div>
              <p v-if="item.excerpt" class="result-excerpt">{{ item.excerpt }}</p>
              <div class="result-meta tw-meta">
                {{ item.board.name }} · {{ timeAgo(item.createdAt) }} · 浏览 {{ formatCount(item.viewCount) }} · 评论 {{ formatCount(item.commentCount) }} · 赞 {{ formatCount(item.likeCount) }}
              </div>
            </RouterLink>
          </article>
        </div>
        <div v-else class="feed">
          <EmptyState icon="⌕" :title="`没有找到与「${keyword}」相关的帖子`" description="换个关键词试试，或清除筛选条件">
            <template #actions>
              <el-button @click="boardFilter = ''">清空筛选</el-button>
              <el-button type="primary" @click="keyword = ''">换个词</el-button>
            </template>
          </EmptyState>
        </div>
      </template>
      <div v-else class="feed">
        <EmptyState icon="⌕" title="输入关键词开始搜索" description="支持标题与全文检索，试试「机器学习」「图书馆」" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.search-shell {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: var(--tw-panel-pad);
}

.search-row {
  display: flex;
  gap: 10px;
}

.search-input :deep(.el-input__inner) {
  height: 40px;
}

.filter-row,
.history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.filter-label {
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-3);
  flex: none;
}

.history-chip {
  font-size: 12px;
  color: var(--tw-ink-2);
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-pill);
  padding: 4px 12px;
  transition: background var(--tw-dur-fast) var(--tw-ease-out), color var(--tw-dur-fast) var(--tw-ease-out);
}

.history-chip:hover {
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}

.history-clear {
  font-size: 12px;
  color: var(--tw-ink-3);
  margin-left: auto;
}

.history-clear:hover {
  color: var(--tw-danger);
}

.result-count {
  margin: 14px 2px;
}

.feed {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  overflow: hidden;
}

.result-item + .result-item {
  border-top: 1px solid var(--tw-line);
}

.result-link {
  display: block;
  padding: 15px 18px;
  transition: background var(--tw-dur-fast) var(--tw-ease-out);
}

.result-link:hover {
  background: #fafbfc;
}

.result-link:hover .result-title {
  color: var(--tw-accent-ink);
}

.result-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.result-title {
  font-size: var(--tw-fs-title);
  font-weight: 600;
  color: var(--tw-ink);
}

.flag.mini {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--tw-r-badge);
  font-size: 11px;
  font-weight: 500;
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}

.flag.mini.solved {
  background: var(--tw-success-soft);
  color: var(--tw-success);
}

.result-excerpt {
  margin: 5px 0 0;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  line-height: var(--tw-lh-caption);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.result-meta {
  margin-top: 8px;
}
</style>
