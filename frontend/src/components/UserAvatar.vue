<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    url?: string | null;
    id?: number;
    size?: number;
  }>(),
  { url: null, id: 0, size: 32 },
);

// 首字母色板：与主题协调的中间调（设计规范 §4.3，饱和度压在 40%-60%）
const PALETTE = ['#5E8B90', '#7B8A99', '#5F8763', '#8F7B4F', '#7A7290', '#8A6E68'] as const;

const bg = computed(() => PALETTE[Math.abs(props.id) % PALETTE.length]);
const initial = computed(() => (props.name ?? '').trim().slice(0, 1).toUpperCase() || '?');
</script>

<template>
  <span
    class="avatar"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      fontSize: `${Math.round(size * 0.42)}px`,
      background: url ? 'transparent' : bg,
    }"
  >
    <img v-if="url" :src="url" :alt="name" />
    <template v-else>{{ initial }}</template>
  </span>
</template>

<style scoped>
.avatar {
  border-radius: var(--tw-r-full);
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 600;
  line-height: 1;
  overflow: hidden;
  flex: none;
  user-select: none;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
