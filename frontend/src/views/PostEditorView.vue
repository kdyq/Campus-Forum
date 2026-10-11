<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import BoardTree from '@/components/BoardTree.vue';
import { createPost, fetchBoards, fetchDraft, fetchPost, fetchTags, saveDraft, updatePost, uploadImage, clearDraft, deletePost } from '@/api/content';
import { useSessionStore } from '@/stores/session';
import { timeAgo } from '@/utils/format';
import type { BoardItem, TagItem } from '@/types/content';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const editId = computed(() => (route.name === 'post-edit' ? Number(route.params.id) : null));
const isEdit = computed(() => editId.value !== null);

const boards = ref<BoardItem[]>([]);
const tags = ref<TagItem[]>([]);
const draftUpdatedAt = ref<string | null>(null);
const submitting = ref(false);
const savingDraft = ref(false);
const loading = ref(true);

const form = reactive({
  boardId: null as number | null,
  title: '',
  content: '',
  isAnonymous: false,
  tagIds: [] as number[],
});

const titleHelp = computed(() => `${form.title.length}/80`);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [bs, ts] = await Promise.all([fetchBoards(), fetchTags()]);
    boards.value = bs;
    tags.value = ts;
    if (isEdit.value) {
      const post = await fetchPost(editId.value!);
      if (!post.authorSafe || post.authorSafe.id !== session.user?.id) {
        ElMessage.error('只有作者可以编辑该帖');
        router.replace({ name: 'post-detail', params: { id: editId.value } });
        return;
      }
      form.boardId = post.board.id;
      form.title = post.title;
      form.content = post.content;
      form.isAnonymous = post.isAnonymous;
      form.tagIds = post.tags.map((t) => t.id);
    } else {
      const draft = await fetchDraft();
      if (draft?.title || draft?.content) {
        form.boardId = draft.boardId ?? null;
        form.title = draft.title ?? '';
        form.content = draft.content ?? '';
        draftUpdatedAt.value = draft.updatedAt;
        ElMessage.info(`已恢复 ${timeAgo(draft.updatedAt)} 保存的草稿`);
      }
    }
  } finally {
    loading.value = false;
  }
}

// 草稿自动保存（新建模式，防抖 1.5s）
let draftTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => ({ title: form.title, content: form.content, boardId: form.boardId }),
  (val) => {
    if (isEdit.value || loading.value) return;
    if (draftTimer) clearTimeout(draftTimer);
    draftTimer = setTimeout(async () => {
      if (!val.title && !val.content) return;
      savingDraft.value = true;
      try {
        const result = await saveDraft({ title: val.title || null, content: val.content || null, boardId: val.boardId ?? null });
        draftUpdatedAt.value = result.updatedAt;
      } catch {
        /* 草稿保存失败不打扰用户 */
      } finally {
        savingDraft.value = false;
      }
    }, 1500);
  },
  { deep: true },
);

onUnmounted(() => draftTimer && clearTimeout(draftTimer));

async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  try {
    const urls = await Promise.all(files.map((f) => uploadImage(f)));
    callback(urls);
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '图片上传失败');
  }
}

async function submit() {
  if (!form.boardId) {
    ElMessage.warning('请选择板块');
    return;
  }
  const title = form.title.trim();
  if (title.length < 4 || title.length > 80) {
    ElMessage.warning('标题长度需在 4 到 80 字之间');
    return;
  }
  if (!form.content.trim()) {
    ElMessage.warning('请输入正文内容');
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      const result = await updatePost(editId.value!, {
        boardId: form.boardId,
        title,
        content: form.content,
        isAnonymous: form.isAnonymous,
        tagIds: form.tagIds,
      });
      ElMessage.success(result.revisionSaved ? '已保存（本次编辑已记入编辑历史）' : '保存成功');
      router.replace({ name: 'post-detail', params: { id: editId.value! } });
    } else {
      const result = await createPost({
        boardId: form.boardId,
        title,
        content: form.content,
        isAnonymous: form.isAnonymous,
        tagIds: form.tagIds,
      });
      await clearDraft();
      ElMessage.success('发布成功');
      router.replace({ name: 'post-detail', params: { id: result.id } });
    }
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '发布失败，请稍后重试');
  } finally {
    submitting.value = false;
  }
}

async function onDelete() {
  if (editId.value === null) return;
  try {
    await ElMessageBox.confirm('确定删除这篇帖子吗？', '删除帖子', { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' });
  } catch {
    return;
  }
  try {
    await deletePost(editId.value);
    ElMessage.success('帖子已删除');
    router.replace({ name: 'home' });
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败');
  }
}

void load();
</script>

<template>
  <div class="editor-shell">
    <aside class="col-left">
      <BoardTree :boards="boards" />
    </aside>

    <main class="col-main" v-loading="loading">
      <h1 class="page-title">{{ isEdit ? '编辑帖子' : '发布新帖' }}</h1>
      <el-input
        v-model="form.title"
        class="title-input"
        placeholder="请输入标题（4-80 字），把问题说清楚"
        maxlength="80"
        show-word-limit
      />
      <div class="editor-wrap">
        <MdEditor
          v-model="form.content"
          theme="light"
          preview
          :footers="['markdownTotal', '=']"
          placeholder="支持 Markdown。可直接粘贴截图，图片会自动上传…"
          @on-upload-img="onUploadImg"
        />
      </div>
      <p class="draft-status tw-meta">
        <template v-if="savingDraft">草稿保存中…</template>
        <template v-else-if="draftUpdatedAt && !isEdit">草稿已于 {{ timeAgo(draftUpdatedAt) }} 自动保存</template>
        <template v-else>&nbsp;</template>
      </p>
    </main>

    <aside class="col-right">
      <section class="panel">
        <h3 class="panel-title">发布设置</h3>
        <div class="field">
          <label class="field-label" for="board-select">板块</label>
          <el-select id="board-select" v-model="form.boardId" placeholder="选择板块" style="width: 100%">
            <el-option v-for="b in boards" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </div>
        <div class="field">
          <label class="field-label" for="tag-select">标签（最多 5 个）</label>
          <el-select
            id="tag-select"
            v-model="form.tagIds"
            multiple
            filterable
            :multiple-limit="5"
            placeholder="选择标签"
            style="width: 100%"
          >
            <el-option v-for="t in tags" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </div>
        <div class="field field-row">
          <label class="field-label" for="anon-switch">匿名发帖</label>
          <el-switch id="anon-switch" v-model="form.isAnonymous" />
        </div>
        <p class="field-help">匿名帖对外显示「匿名用户」，管理员可在后台追溯真实作者。</p>
        <div class="submit-row">
          <el-button type="primary" class="submit-btn" :loading="submitting" @click="submit">
            {{ isEdit ? '保存修改' : '发布' }}
          </el-button>
          <el-button v-if="isEdit" text type="danger" @click="onDelete">删除</el-button>
        </div>
        <p class="field-help">求助类帖子：问题解决后记得在评论区采纳最佳答案。</p>
      </section>
      <section class="panel">
        <h3 class="panel-title">发帖须知</h3>
        <ul class="notice-list">
          <li>标题写清楚，正文给出背景与你尝试过的方法</li>
          <li>禁止广告、刷屏与站外引流</li>
          <li>尊重他人，理性讨论</li>
        </ul>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.editor-shell {
  max-width: var(--tw-page-max);
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: grid;
  grid-template-columns: var(--tw-col-left) minmax(0, 1fr) 288px;
  gap: var(--tw-col-gap);
  align-items: start;
}

.col-left {
  position: sticky;
  top: var(--tw-sticky-top);
}

.col-right {
  position: sticky;
  top: var(--tw-sticky-top);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.page-title {
  margin: 2px 0 14px;
  font-size: var(--tw-fs-title-lg);
  font-weight: 600;
  color: var(--tw-ink);
}

.title-input {
  margin-bottom: 12px;
}

.title-input :deep(.el-input__inner) {
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

.editor-wrap {
  border-radius: var(--tw-r-card);
  overflow: hidden;
  border: 1px solid var(--tw-line);
}

.editor-wrap :deep(.md-editor) {
  --md-bk-color: var(--tw-surface);
  font-family: var(--tw-font-sans);
}

.editor-wrap :deep(.md-editor-toolbar-wrapper) {
  --md-bk-color: var(--tw-surface);
}

.draft-status {
  margin: 8px 2px 0;
  min-height: 16px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: var(--tw-panel-pad);
}

.panel-title {
  margin: 2px 0 12px;
  font-size: var(--tw-fs-label);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--tw-ink-2);
}

.field {
  margin-bottom: 12px;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-label {
  display: block;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  margin-bottom: 6px;
}

.field-help {
  font-size: 12px;
  color: var(--tw-ink-3);
  line-height: 1.5;
  margin: 6px 0 0;
}

.submit-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
}

.submit-btn {
  flex: 1;
}

.notice-list {
  margin: 0;
  padding-left: 16px;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  line-height: 1.8;
}

@media (max-width: 1180px) {
  .col-right {
    grid-column: 2;
    position: static;
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 860px) {
  .editor-shell {
    grid-template-columns: 1fr;
    padding: 16px 18px 60px;
  }

  .col-left {
    display: none;
  }

  .col-right {
    grid-column: auto;
    grid-template-columns: 1fr;
  }

  .editor-wrap :deep(.md-editor) {
    height: 380px;
  }
}
</style>
