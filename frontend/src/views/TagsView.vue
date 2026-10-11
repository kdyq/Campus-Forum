<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { fetchTags } from '@/api/content';
import type { TagItem } from '@/types/content';

const tags = ref<TagItem[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    tags.value = await fetchTags();
  } catch {
    /* 忽略 */
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="page">
    <section class="panel">
      <h1 class="page-title">标签广场</h1>
      <p class="page-sub">按标签浏览讨论，找到同好</p>
      <p v-if="loading" class="loading-hint">加载中…</p>
      <div v-else class="tag-cloud">
        <RouterLink
          v-for="t in tags"
          :key="t.id"
          :to="{ name: 'tag', params: { slug: t.slug } }"
          class="tag-card"
          :class="{ official: t.isOfficial }"
        >
          <span class="tag-name">{{ t.name }}</span>
          <span v-if="t.isOfficial" class="official-mark">官方</span>
          <span class="tag-count tw-meta">{{ t.postCount }} 帖</span>
        </RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 24px 26px;
}

.page-title {
  margin: 0;
  font-size: var(--tw-fs-title-lg);
  font-weight: 600;
  color: var(--tw-ink);
}

.page-sub {
  margin: 4px 0 20px;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
}

.loading-hint {
  text-align: center;
  color: var(--tw-ink-3);
  padding: 24px 0;
}

.tag-cloud {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}

.tag-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-ctrl);
  transition: border-color var(--tw-dur-fast) var(--tw-ease-out), background var(--tw-dur-fast) var(--tw-ease-out);
}

.tag-card:hover {
  border-color: var(--tw-accent);
  background: var(--tw-accent-soft);
}

.tag-card:hover .tag-name {
  color: var(--tw-accent-ink);
}

.tag-name {
  font-weight: 500;
  color: var(--tw-ink);
  font-size: var(--tw-fs-body-sm);
}

.official-mark {
  font-size: 10.5px;
  color: var(--tw-accent-ink);
  background: var(--tw-accent-soft);
  border-radius: var(--tw-r-badge);
  padding: 1px 5px;
  font-weight: 600;
}

.tag-count {
  margin-left: auto;
  font-size: 11.5px;
}
</style>
