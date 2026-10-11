<script setup lang="ts">
import { ref } from 'vue';
import { createComment } from '@/api/content';

const props = defineProps<{
  postId: number;
  parentId?: number | null;
  replyToUserId?: number | null;
  placeholder?: string;
  autoFocus?: boolean;
}>();

const emit = defineEmits<{ posted: [] }>();

const content = ref('');
const submitting = ref(false);
const boxRef = ref<HTMLTextAreaElement | null>(null);

async function submit() {
  const text = content.value.trim();
  if (!text) {
    ElMessage.warning('请输入评论内容');
    return;
  }
  submitting.value = true;
  try {
    await createComment(props.postId, {
      content: text,
      isAnonymous: false,
      parentId: props.parentId ?? null,
      replyToUserId: props.replyToUserId ?? null,
    });
    content.value = '';
    ElMessage.success('评论发布成功');
    emit('posted');
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '评论发布失败');
  } finally {
    submitting.value = false;
  }
}

function focus() {
  boxRef.value?.focus();
}

if (props.autoFocus) {
  setTimeout(() => focus(), 50);
}
</script>

<template>
  <div class="comment-editor">
    <textarea
      ref="boxRef"
      v-model="content"
      class="comment-input"
      :placeholder="placeholder ?? '友善评论，理性讨论…'"
      rows="3"
      maxlength="2000"
      @keydown.ctrl.enter="submit"
    ></textarea>
    <div class="comment-editor-foot">
      <span class="tw-meta">Ctrl + Enter 发送 · 最多 2000 字</span>
      <el-button type="primary" size="small" :loading="submitting" @click="submit">发布评论</el-button>
    </div>
  </div>
</template>

<style scoped>
.comment-editor {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-ctrl);
  transition: border-color var(--tw-dur-fast) var(--tw-ease-out), box-shadow var(--tw-dur-fast) var(--tw-ease-out);
}

.comment-editor:focus-within {
  border-color: var(--tw-accent);
  box-shadow: 0 0 0 3px var(--tw-focus-ring);
}

.comment-input {
  display: block;
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  resize: vertical;
  min-height: 72px;
  padding: 12px 14px;
  font: inherit;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
}

.comment-editor-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-top: 1px solid var(--tw-line);
}
</style>
