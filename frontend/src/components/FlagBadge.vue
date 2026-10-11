<script setup lang="ts">
// 状态标记（设计规范 §4.3）：统一 21px 高、5px 圆角、语义色底
const props = defineProps<{
  kind: 'pinned' | 'featured' | 'solved' | 'pending' | 'anonymous' | 'locked' | 'custom';
  text?: string;
}>();

const STYLES: Record<string, { text: string; cls: string }> = {
  pinned: { text: '置顶', cls: 'flag-accent' },
  featured: { text: '精华', cls: 'flag-accent' },
  solved: { text: '已解决', cls: 'flag-solved' },
  pending: { text: '待审核', cls: 'flag-warning' },
  locked: { text: '已锁定', cls: 'flag-quiet' },
  anonymous: { text: '匿名', cls: 'flag-quiet' },
  custom: { text: props.text ?? '', cls: 'flag-quiet' },
};

const style = STYLES[props.kind];
</script>

<template>
  <span class="flag" :class="style.cls">{{ props.text || style.text }}</span>
</template>

<style scoped>
.flag {
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 7px;
  border-radius: var(--tw-r-badge);
  font-size: var(--tw-fs-micro);
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.flag-accent {
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}

.flag-solved {
  background: var(--tw-success-soft);
  color: var(--tw-success);
}

.flag-warning {
  background: var(--tw-warning-soft);
  color: var(--tw-warning);
}

.flag-quiet {
  background: var(--tw-surface-2);
  color: var(--tw-ink-2);
}
</style>
