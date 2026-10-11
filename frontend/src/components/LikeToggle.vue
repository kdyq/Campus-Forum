<script setup lang="ts">
// 点赞切换：乐观更新 + 失败回滚抖动（设计规范 §4.3）
import { ref } from 'vue';
import { toggleLike, untoggleLike } from '@/api/content';

const props = defineProps<{
  targetType: 'POST' | 'COMMENT';
  targetId: number;
  liked: boolean;
  count: number;
}>();

const liked = ref(props.liked);
const likeCount = ref(props.count);
const busy = ref(false);
const shaking = ref(false);

async function onClick() {
  if (busy.value) return;
  busy.value = true;
  const prevLiked = liked.value;
  const prevCount = likeCount.value;
  liked.value = !prevLiked;
  likeCount.value = prevCount + (prevLiked ? -1 : 1);
  try {
    const result = prevLiked
      ? await untoggleLike(props.targetType, props.targetId)
      : await toggleLike(props.targetType, props.targetId);
    liked.value = result.liked;
    likeCount.value = result.likeCount;
  } catch {
    liked.value = prevLiked;
    likeCount.value = prevCount;
    shaking.value = true;
    setTimeout(() => (shaking.value = false), 260);
    ElMessage.error('点赞失败，请稍后重试');
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button type="button" class="lk-btn" :class="{ on: liked, shake: shaking }" :aria-pressed="liked" @click="onClick">
    <span class="lk-ico" aria-hidden="true">{{ liked ? '♥' : '♡' }}</span>
    <span class="lk-num tw-meta">{{ likeCount > 0 ? likeCount : '赞' }}</span>
  </button>
</template>

<style scoped>
.lk-btn {
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

.lk-btn:hover {
  border-color: var(--tw-accent);
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}

.lk-btn.on {
  background: var(--tw-accent);
  border-color: var(--tw-accent);
  color: var(--tw-btn-on-accent);
}

.lk-ico {
  font-size: 14px;
  line-height: 1;
}

.lk-num {
  font-size: 12px;
}

.lk-btn.on .lk-num {
  color: var(--tw-btn-on-accent);
  opacity: 0.9;
}

@keyframes lk-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  50% { transform: translateX(2px); }
  75% { transform: translateX(-2px); }
}

.shake {
  animation: lk-shake 0.24s linear;
}
</style>
