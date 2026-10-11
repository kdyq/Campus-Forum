<script setup lang="ts">
// 标签胶囊（设计规范 §4.3 Tag）：surface-2 底，hover 变强调浅底
defineProps<{ slug: string; clickable?: boolean }>();
</script>

<template>
  <component
    :is="clickable === false ? 'span' : 'RouterLink'"
    class="tag-pill"
    :to="clickable === false ? undefined : { name: 'tag', params: { slug } }"
  >
    <slot />
  </component>
</template>

<style scoped>
.tag-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: var(--tw-r-pill);
  font-size: 12px;
  line-height: 1;
  background: var(--tw-surface-2);
  color: var(--tw-ink-2);
  transition: background var(--tw-dur-fast) var(--tw-ease-out), color var(--tw-dur-fast) var(--tw-ease-out);
}

a.tag-pill:hover {
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
}
</style>
