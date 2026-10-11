<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue';

defineProps<{
  name: string;
  username?: string | null;
  avatarUrl?: string | null;
  userId?: number;
  size?: number;
  anonymous?: boolean;
  meta?: string;
}>();
</script>

<template>
  <RouterLink v-if="!anonymous && username" :to="{ name: 'user', params: { username } }" class="user-link">
    <UserAvatar :name="name" :url="avatarUrl" :id="userId" :size="size ?? 26" />
    <span class="user-link-name">{{ name }}</span>
    <span v-if="meta" class="user-link-meta tw-meta">{{ meta }}</span>
  </RouterLink>
  <span v-else class="user-link user-link--static">
    <UserAvatar :name="anonymous ? '匿名' : name" :url="anonymous ? null : avatarUrl" :id="anonymous ? -1 : userId" :size="size ?? 26" />
    <span class="user-link-name">{{ anonymous ? '匿名用户' : name }}</span>
    <span v-if="meta" class="user-link-meta tw-meta">{{ meta }}</span>
  </span>
</template>

<style scoped>
.user-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}

.user-link-name {
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

a.user-link:hover .user-link-name {
  color: var(--tw-accent-ink);
}

.user-link-meta {
  margin-left: 2px;
}
</style>
