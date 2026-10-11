<script setup lang="ts">
// 左栏板块树（设计规范 §4.2 板块树项）
import type { BoardItem } from '@/types/content';

defineProps<{
  boards: BoardItem[];
  activeSlug?: string;
}>();
</script>

<template>
  <nav class="navcard" aria-label="板块导航">
    <div class="nav-h">板块</div>
    <RouterLink to="/" class="nav-i" :class="{ on: !activeSlug }">
      <span class="nav-ico" aria-hidden="true">☰</span>
      <span>全部</span>
    </RouterLink>
    <div class="nav-div" role="separator"></div>
    <RouterLink
      v-for="b in boards"
      :key="b.id"
      :to="{ name: 'board', params: { slug: b.slug } }"
      class="nav-i"
      :class="{ on: activeSlug === b.slug }"
    >
      <span class="nav-ico" aria-hidden="true">▪</span>
      <span class="nav-name">{{ b.name }}</span>
      <span class="cnt tw-meta">{{ b.postCount }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.navcard {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 10px;
}

.nav-h {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--tw-ink-3);
  letter-spacing: 0.07em;
  padding: 8px 10px 6px;
}

.nav-i {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 10px;
  border-radius: var(--tw-r-ctrl);
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
  transition: background var(--tw-dur-fast) var(--tw-ease-out), color var(--tw-dur-fast) var(--tw-ease-out);
}

.nav-i:hover {
  background: var(--tw-surface-2);
  color: var(--tw-ink);
}

.nav-i.on {
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
  font-weight: 500;
}

.nav-i.on .nav-ico,
.nav-i.on .cnt {
  color: var(--tw-accent);
}

.nav-ico {
  font-size: 13px;
  flex: none;
  color: var(--tw-ink-2);
}

.nav-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cnt {
  margin-left: auto;
  font-size: 11.5px;
}

.nav-div {
  height: 1px;
  background: var(--tw-line);
  margin: 8px 6px;
}
</style>
