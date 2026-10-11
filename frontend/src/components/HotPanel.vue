<script setup lang="ts">
// 热榜面板（设计规范 §4.3 热榜条目）：前三名序号强调
import { onMounted, ref } from 'vue';
import { fetchHot, type HotItem } from '@/api/discover';

const items = ref<HotItem[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    items.value = await fetchHot();
  } catch {
    /* 热榜加载失败静默处理 */
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <section class="panel">
    <h3 class="panel-title">热门话题</h3>
    <p v-if="loading" class="hot-empty">加载中…</p>
    <p v-else-if="items.length === 0" class="hot-empty">暂无热门内容</p>
    <ol v-else class="hot-list">
      <li v-for="(item, i) in items" :key="item.id" class="hot-item">
        <RouterLink :to="{ name: 'post-detail', params: { id: item.id } }" class="hot-link">
          <span class="rank" :class="{ top: i < 3 }">{{ i + 1 }}</span>
          <span class="hot-body">
            <span class="hot-title">{{ item.title }}</span>
            <span class="hot-sub tw-meta">{{ item.boardName }} · 热 {{ item.heat }}</span>
          </span>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
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

.hot-empty {
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-3);
  margin: 0;
  padding: 8px 0;
}

.hot-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.hot-item {
  padding: 4px 0;
}

.hot-link {
  display: flex;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 7px;
  align-items: flex-start;
}

.hot-link:hover {
  background: var(--tw-surface-2);
}

.hot-link:hover .hot-title {
  color: var(--tw-accent-ink);
}

.rank {
  font-family: var(--tw-font-mono);
  font-size: 12.5px;
  color: var(--tw-ink-3);
  width: 18px;
  flex: none;
  text-align: center;
  line-height: 1.5;
}

.rank.top {
  color: var(--tw-accent);
  font-weight: 600;
}

.hot-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hot-title {
  font-size: var(--tw-fs-caption);
  line-height: 1.55;
  color: var(--tw-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.hot-sub {
  font-size: 11.2px;
}
</style>
