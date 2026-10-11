<script setup lang="ts">
import { computed, ref } from 'vue';
import { addBookmark, removeBookmark } from '@/api/content';

const props = defineProps<{
  postId: number;
  bookmarked: boolean;
  count: number;
}>();

const bookmarked = ref(props.bookmarked);
const bookmarkCount = ref(props.count);
const busy = ref(false);

const tip = computed(() => (bookmarked.value ? '取消收藏' : '收藏'));

async function onClick() {
  if (busy.value) return;
  busy.value = true;
  const prev = bookmarked.value;
  bookmarked.value = !prev;
  bookmarkCount.value = Math.max(0, bookmarkCount.value + (prev ? -1 : 1));
  try {
    const result = prev ? await removeBookmark(props.postId) : await addBookmark(props.postId);
    bookmarked.value = result.bookmarked;
    bookmarkCount.value = result.bookmarkCount;
    ElMessage.success(result.bookmarked ? '已加入收藏' : '已取消收藏');
  } catch {
    bookmarked.value = prev;
    bookmarkCount.value = props.count;
    ElMessage.error('操作失败，请稍后重试');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button type="button" class="bm-btn" :class="{ on: bookmarked }" :aria-pressed="bookmarked" :title="tip" @click="onClick">
    <span aria-hidden="true">{{ bookmarked ? '★' : '☆' }}</span>
    <span class="tw-meta">{{ bookmarkCount > 0 ? bookmarkCount : '收藏' }}</span>
  </button>
</template>

<style scoped>
.bm-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: var(--tw-r-ctrl);
  border: 1px solid var(--tw-line);
  color: var(--tw-ink-2);
  transition: all var(--tw-dur-fast) var(--tw-ease-out);
}

.bm-btn:hover {
  border-color: var(--tw-accent);
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}

.bm-btn.on {
  background: var(--tw-accent);
  border-color: var(--tw-accent);
  color: var(--tw-btn-on-accent);
}

.bm-btn.on .tw-meta {
  color: var(--tw-btn-on-accent);
  opacity: 0.9;
}
</style>
