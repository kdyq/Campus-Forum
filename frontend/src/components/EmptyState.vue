<script setup lang="ts">
// 空状态（设计规范 §4.4）：图标 + 说明 + 引导动作
defineProps<{
  icon?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon" aria-hidden="true">{{ icon ?? '◌' }}</div>
    <p class="empty-title">{{ title }}</p>
    <p v-if="description" class="empty-desc">{{ description }}</p>
    <div class="empty-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  padding: 60px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 40px;
  line-height: 1;
  color: var(--tw-line-strong);
  margin-bottom: 16px;
  user-select: none;
}

.empty-title {
  margin: 0;
  font-size: var(--tw-fs-body);
  color: var(--tw-ink);
}

.empty-desc {
  margin: 6px 0 0;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-3);
}

.empty-actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
