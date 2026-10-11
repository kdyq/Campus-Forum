<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessageBox } from 'element-plus';
import FlagBadge from '@/components/FlagBadge.vue';
import LikeToggle from '@/components/LikeToggle.vue';
import UserLink from '@/components/UserLink.vue';
import { timeAgo } from '@/utils/format';
import { deleteComment } from '@/api/content';
import { useSessionStore } from '@/stores/session';
import type { CommentNode } from '@/types/content';

const props = defineProps<{
  node: CommentNode;
  postId: number;
  isTop: boolean;
  floor?: number;
  canAccept?: boolean;
  acceptedId?: number | null;
}>();

const emit = defineEmits<{ reply: [node: CommentNode]; deleted: [id: number]; accept: [id: number] }>();

const session = useSessionStore();
const collapsed = ref(props.isTop && props.node.replies.length > 3);
const visibleReplies = computed(() => (collapsed.value ? props.node.replies.slice(0, 3) : props.node.replies));

const isMine = (node: CommentNode): boolean => node.author?.id === session.user?.id;

async function onDelete(node: CommentNode) {
  try {
    await ElMessageBox.confirm('确定删除这条评论吗？', '删除评论', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  } catch {
    return;
  }
  try {
    await deleteComment(node.id);
    ElMessage.success('评论已删除');
    emit('deleted', node.id);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败');
  }
}

function onAccept() {
  emit('accept', props.node.id);
}
</script>

<template>
  <article class="comment" :class="{ 'comment--top': isTop }">
    <div class="comment-head">
      <UserLink
        :name="node.isAnonymous ? '匿名用户' : (node.author?.displayName ?? '')"
        :username="node.isAnonymous ? null : node.author?.username"
        :avatar-url="node.isAnonymous ? null : node.author?.avatarUrl"
        :user-id="node.isAnonymous ? -node.id : node.author?.id"
        :anonymous="node.isAnonymous"
        :size="isTop ? 32 : 26"
      />
      <span v-if="isTop && floor !== undefined" class="tw-meta floor">{{ floor }} 楼</span>
      <span class="tw-meta">{{ timeAgo(node.createdAt) }}</span>
      <FlagBadge v-if="node.status === 'PENDING'" kind="pending" />
      <span v-if="canAccept && isTop && !node.deleted && acceptedId === null" class="accept-wrap">
        <el-button size="small" plain type="primary" @click="onAccept">采纳为最佳答案</el-button>
      </span>
      <span v-if="acceptedId === node.id" class="accept-mark">
        <FlagBadge kind="solved" text="最佳答案" />
      </span>
    </div>

    <p v-if="node.deleted" class="comment-content comment-deleted">该评论已删除</p>
    <p v-else class="comment-content">
      <span v-if="node.replyToUser" class="reply-at">回复 @{{ node.replyToUser.displayName }}</span>
      {{ node.content }}
    </p>

    <div v-if="!node.deleted" class="comment-actions">
      <LikeToggle target-type="COMMENT" :target-id="node.id" :liked="node.likeByViewer" :count="node.likeCount" />
      <button type="button" class="act-btn" @click="emit('reply', node)">回复</button>
      <button v-if="isMine(node) || session.user?.role === 'SUPER_ADMIN'" type="button" class="act-btn act-danger" @click="onDelete(node)">删除</button>
    </div>

    <!-- 楼中楼 -->
    <div v-if="node.replies.length > 0" class="replies">
      <div v-for="r in visibleReplies" :key="r.id" class="reply-item">
        <div class="reply-head">
          <UserLink
            :name="r.isAnonymous ? '匿名用户' : (r.author?.displayName ?? '')"
            :username="r.isAnonymous ? null : r.author?.username"
            :avatar-url="r.isAnonymous ? null : r.author?.avatarUrl"
            :user-id="r.isAnonymous ? -r.id : r.author?.id"
            :anonymous="r.isAnonymous"
            :size="22"
          />
          <span class="tw-meta">{{ timeAgo(r.createdAt) }}</span>
          <button v-if="!r.deleted" type="button" class="act-btn" @click="emit('reply', r)">回复</button>
          <button v-if="!r.deleted && (isMine(r) || session.user?.role === 'SUPER_ADMIN')" type="button" class="act-btn act-danger" @click="onDelete(r)">删除</button>
        </div>
        <p v-if="r.deleted" class="reply-content comment-deleted">该评论已删除</p>
        <p v-else class="reply-content">
          <span v-if="r.replyToUser" class="reply-at">回复 @{{ r.replyToUser.displayName }}</span>
          {{ r.content }}
        </p>
      </div>
      <button v-if="collapsed" type="button" class="expand-btn" @click="collapsed = false">
        展开其余 {{ node.replies.length - 3 }} 条回复
      </button>
    </div>
  </article>
</template>

<style scoped>
.comment {
  padding: 13px 15px;
  border-radius: var(--tw-r-ctrl);
}

.comment--top {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 18px 20px;
}

.comment--top + .comment--top {
  margin-top: 12px;
}

.comment-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.floor {
  margin-right: auto;
}

.accept-wrap {
  margin-left: auto;
}

.accept-mark {
  margin-left: auto;
}

.comment-content {
  margin: 10px 0 8px;
  font-size: var(--tw-fs-body-sm);
  line-height: var(--tw-lh-body-sm);
  color: var(--tw-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-deleted {
  color: var(--tw-ink-3);
}

.reply-at {
  color: var(--tw-accent-ink);
  margin-right: 4px;
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.act-btn {
  font-size: 12.5px;
  color: var(--tw-ink-3);
  padding: 4px 8px;
  border-radius: var(--tw-r-ctrl);
  transition: color var(--tw-dur-fast) var(--tw-ease-out), background var(--tw-dur-fast) var(--tw-ease-out);
}

.act-btn:hover {
  color: var(--tw-accent-ink);
  background: var(--tw-surface-2);
}

.act-danger:hover {
  color: var(--tw-danger);
  background: var(--tw-danger-soft);
}

/* 楼中楼容器：surface-2 底 + 左侧线，左缩进 */
.replies {
  margin-top: 10px;
  margin-left: 44px;
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-ctrl);
  padding: 13px 15px;
  border-left: 2px solid var(--tw-line-strong);
}

.reply-item + .reply-item {
  margin-top: 10px;
}

.reply-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-content {
  margin: 5px 0 0;
  font-size: 13.4px;
  line-height: 1.7;
  color: var(--tw-ink);
  white-space: pre-wrap;
  word-break: break-word;
}

.expand-btn {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--tw-accent);
  padding: 4px 0;
}

.expand-btn:hover {
  color: var(--tw-accent-ink);
}

@media (max-width: 640px) {
  .replies {
    margin-left: 20px;
  }
}
</style>
