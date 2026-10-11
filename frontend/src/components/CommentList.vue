<script setup lang="ts">
import CommentItem from '@/components/CommentItem.vue';
import type { CommentNode } from '@/types/content';

defineProps<{
  nodes: CommentNode[];
  postId: number;
  canAccept?: boolean;
  acceptedId?: number | null;
}>();

const emit = defineEmits<{ reply: [node: CommentNode]; deleted: []; accept: [id: number] }>();
</script>

<template>
  <div class="comment-list">
    <CommentItem
      v-for="(n, idx) in nodes"
      :key="n.id"
      :node="n"
      :post-id="postId"
      :is-top="true"
      :floor="idx + 1"
      :can-accept="canAccept"
      :accepted-id="acceptedId"
      @reply="emit('reply', $event)"
      @deleted="emit('deleted')"
      @accept="emit('accept', $event)"
    />
    <p v-if="nodes.length === 0" class="comment-empty">还没有评论，来抢一楼</p>
  </div>
</template>

<style scoped>
.comment-list {
  display: flex;
  flex-direction: column;
}

.comment-empty {
  text-align: center;
  color: var(--tw-ink-3);
  font-size: var(--tw-fs-body-sm);
  padding: 32px 0;
}
</style>
