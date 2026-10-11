<script setup lang="ts">
// 帖子条目（设计规范 §4.3）：发丝线分层、两行摘要、等宽元数据
import FlagBadge from '@/components/FlagBadge.vue';
import TagPill from '@/components/TagPill.vue';
import UserLink from '@/components/UserLink.vue';
import { timeAgo, formatCount } from '@/utils/format';
import type { FeedItem } from '@/types/content';

defineProps<{ item: FeedItem }>();
</script>

<template>
  <article class="post">
    <UserLink
      :name="item.isAnonymous ? '匿名用户' : (item.author?.displayName ?? '已注销')"
      :username="item.isAnonymous ? null : item.author?.username"
      :avatar-url="item.isAnonymous ? null : item.author?.avatarUrl"
      :user-id="item.isAnonymous ? -item.id : item.author?.id"
      :anonymous="item.isAnonymous"
      :size="36"
    />
    <div class="post-body">
      <div class="post-head">
        <FlagBadge v-if="item.isPinned" kind="pinned" />
        <FlagBadge v-if="item.isFeatured" kind="featured" />
        <FlagBadge v-if="item.status === 'SOLVED' || item.hasAccepted" kind="solved" />
        <FlagBadge v-if="item.status === 'PENDING'" kind="pending" />
        <FlagBadge v-if="item.status === 'LOCKED'" kind="locked" />
        <RouterLink class="post-title" :to="{ name: 'post-detail', params: { id: item.id } }">{{ item.title }}</RouterLink>
      </div>
      <p v-if="item.excerpt" class="post-excerpt">{{ item.excerpt }}</p>
      <div class="post-meta">
        <FlagBadge kind="custom" :text="item.board.name" />
        <span class="tw-meta">{{ timeAgo(item.lastActivityAt) }}</span>
        <span class="tw-meta m">浏览 {{ formatCount(item.viewCount) }}</span>
        <span class="tw-meta m">评论 {{ formatCount(item.commentCount) }}</span>
        <span class="tw-meta m">赞 {{ formatCount(item.likeCount) }}</span>
        <span v-if="item.realAuthorVisible && item.realAuthor" class="tw-meta admin-note">
          真实作者：{{ item.realAuthor.displayName }}
        </span>
        <span class="tags">
          <TagPill v-for="t in item.tags" :key="t.id" :slug="t.slug">{{ t.name }}</TagPill>
        </span>
      </div>
    </div>
    <img
      v-if="item.thumbnailUrl"
      class="thumb"
      :src="item.thumbnailUrl"
      alt=""
      loading="lazy"
    />
  </article>
</template>

<style scoped>
.post {
  display: flex;
  gap: 13px;
  padding: var(--tw-list-row-pad);
  transition: background var(--tw-dur-fast) var(--tw-ease-out);
  align-items: flex-start;
}

.post:hover {
  background: #fafbfc;
}

.post:hover .post-title {
  color: var(--tw-accent-ink);
}

.post + .post {
  border-top: 1px solid var(--tw-line);
}

.post-body {
  min-width: 0;
  flex: 1;
}

.post-head {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.post-title {
  font-size: var(--tw-fs-title);
  font-weight: 600;
  line-height: var(--tw-lh-title);
  color: var(--tw-ink);
  transition: color var(--tw-dur-fast) var(--tw-ease-out);
}

.post-excerpt {
  margin: 4px 0 0;
  font-size: var(--tw-fs-caption);
  line-height: var(--tw-lh-caption);
  color: var(--tw-ink-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-meta {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-top: 9px;
  flex-wrap: wrap;
}

.admin-note {
  color: var(--tw-warning);
}

.tags {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.thumb {
  width: 96px;
  height: 64px;
  border-radius: var(--tw-r-ctrl);
  flex: none;
  object-fit: cover;
  border: 1px solid var(--tw-line);
}

@media (max-width: 640px) {
  .thumb {
    display: none;
  }

  .post {
    padding: 15px 12px;
  }
}
</style>
