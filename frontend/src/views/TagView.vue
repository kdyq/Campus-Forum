<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '@/components/EmptyState.vue';
import PostItem from '@/components/PostItem.vue';
import PostSkeleton from '@/components/PostSkeleton.vue';
import { fetchFeed, fetchTags } from '@/api/content';
import { useInfiniteScroll } from '@/composables/useInfiniteScroll';
import type { FeedItem, TagItem } from '@/types/content';

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ''));

const tag = ref<TagItem | null>(null);
const items = ref<FeedItem[]>([]);
const cursor = ref<string | null>(null);
const loading = ref(true);
const loadingMore = ref(false);
const finished = ref(false);
const loadError = ref(false);

const { sentinelRef } = useInfiniteScroll(() => void loadMore());

async function load() {
  loading.value = true;
  loadError.value = false;
  finished.value = false;
  items.value = [];
  cursor.value = null;
  try {
    const [tags, feed] = await Promise.all([fetchTags(), fetchFeed({ tag: slug.value, sort: 'latest', limit: 20 })]);
    tag.value = tags.find((t) => t.slug === slug.value) ?? null;
    items.value = feed.items;
    cursor.value = feed.nextCursor;
    finished.value = feed.nextCursor === null;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (finished.value || loadingMore.value || !cursor.value) return;
  loadingMore.value = true;
  try {
    const feed = await fetchFeed({ tag: slug.value, sort: 'latest', limit: 20, cursor: cursor.value });
    items.value = [...items.value, ...feed.items];
    cursor.value = feed.nextCursor;
    finished.value = feed.nextCursor === null;
  } catch {
    ElMessage.error('加载更多失败');
  } finally {
    loadingMore.value = false;
  }
}

watch(slug, () => void load());
onMounted(load);
</script>

<template>
  <main class="page">
    <section class="tag-head">
      <h1 class="tag-title"># {{ tag?.name ?? slug }}</h1>
      <p class="tag-sub tw-meta">{{ tag ? `${tag.postCount} 个帖子` : '' }}<span v-if="tag?.isOfficial"> · 官方标签</span></p>
    </section>

    <div v-if="loading" class="feed"><PostSkeleton :rows="4" /></div>
    <div v-else-if="loadError" class="feed error-box">
      <EmptyState icon="⚠" title="加载失败" description="网络出了点问题">
        <template #actions><el-button type="primary" @click="load">重新加载</el-button></template>
      </EmptyState>
    </div>
    <template v-else>
      <div class="feed">
        <PostItem v-for="item in items" :key="item.id" :item="item" />
        <EmptyState v-if="items.length === 0" icon="#" title="这个标签下还没有帖子" description="发帖时选择该标签，讨论就会聚集在这里">
          <template #actions>
            <RouterLink to="/p/new"><el-button type="primary">去发帖</el-button></RouterLink>
          </template>
        </EmptyState>
      </div>
      <div ref="sentinelRef"></div>
      <p v-if="loadingMore" class="list-foot tw-meta">正在加载…</p>
      <p v-else-if="finished && items.length > 0" class="list-foot tw-meta">没有更多了</p>
    </template>
  </main>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
}

.tag-head {
  padding: 4px 4px 14px;
}

.tag-title {
  margin: 0;
  font-size: var(--tw-fs-display);
  font-weight: 600;
  color: var(--tw-ink);
}

.tag-sub {
  margin: 6px 0 0;
}

.feed {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  overflow: hidden;
  min-height: 160px;
}

.error-box {
  background: transparent;
  border: none;
}

.list-foot {
  text-align: center;
  padding: 24px 0;
  font-size: 12.5px;
}
</style>
