<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessageBox } from 'element-plus';
import BoardTree from '@/components/BoardTree.vue';
import CommentEditor from '@/components/CommentEditor.vue';
import CommentList from '@/components/CommentList.vue';
import ContentRenderer from '@/components/ContentRenderer.vue';
import FlagBadge from '@/components/FlagBadge.vue';
import BookmarkToggle from '@/components/BookmarkToggle.vue';
import LikeToggle from '@/components/LikeToggle.vue';
import ReportDialog from '@/components/ReportDialog.vue';
import UserLink from '@/components/UserLink.vue';
import { acceptComment, createComment, deletePost, fetchBoards, fetchComments, fetchPost } from '@/api/content';
import { useEntrance } from '@/composables/useEntrance';
import { useSessionStore } from '@/stores/session';
import { formatTime, formatCount, timeAgo } from '@/utils/format';
import type { CommentNode, PostDetail } from '@/types/content';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const rootRef = ref<HTMLElement | null>(null);

useEntrance(rootRef, {
  tree: '.col-left',
  title: '.post-title-h1',
  body: '.post-article',
  items: '.comment--top',
  panels: '.rail .panel',
});

const postId = computed(() => Number(route.params.id));
const post = ref<PostDetail | null>(null);
const comments = ref<CommentNode[]>([]);
const boards = ref<Array<{ id: number; name: string; slug: string; description: string | null; order: number; postCount: number }>>([]);
const loading = ref(true);
const loadError = ref(false);

const replyTarget = ref<CommentNode | null>(null);
const reportVisible = ref(false);

const isAuthor = computed(() => session.user && post.value && (post.value.authorSafe?.id === session.user.id || (!post.value.isAnonymous && post.value.author?.id === session.user.id)));
const canAccept = computed(() => Boolean(isAuthor.value) && post.value?.acceptedComment === null);
const acceptedCommentId = computed(() => post.value?.acceptedComment?.id ?? null);

async function load() {
  loading.value = true;
  loadError.value = false;
  try {
    const [p, cs, bs] = await Promise.all([fetchPost(postId.value), fetchComments(postId.value), fetchBoards()]);
    post.value = p;
    comments.value = cs;
    boards.value = bs;
    document.title = `${p.title} · 同窗`;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

function onReply(node: CommentNode) {
  replyTarget.value = node;
  setTimeout(() => document.getElementById('comment-editor-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
}

function replyPlaceholder(): string {
  const t = replyTarget.value;
  if (!t) return '友善评论，理性讨论…';
  const name = t.isAnonymous ? '匿名用户' : (t.author?.displayName ?? '');
  return t.isTop ? `回复 ${name}（${t.id} 楼）…` : `回复 @${name}…`;
}

async function refreshComments(): Promise<void> {
  comments.value = await fetchComments(postId.value);
  if (post.value) post.value.commentCount = comments.value.reduce((n, c) => n + 1 + c.replies.length, 0);
}

function onCommentPosted(): void {
  void refreshComments();
  ElMessage.success('评论发布成功');
}

async function onReplyPosted(): Promise<void> {
  replyTarget.value = null;
  await refreshComments();
}

async function onAccept(commentId: number) {
  try {
    await acceptComment(postId.value, commentId);
    ElMessage.success('已采纳为最佳答案');
    await load();
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '采纳失败');
  }
}

function onCommentDeleted() {
  void fetchComments(postId.value).then((cs) => (comments.value = cs));
  if (post.value) post.value.commentCount = Math.max(0, post.value.commentCount - 1);
}

async function onDeletePost() {
  try {
    await ElMessageBox.confirm('删除后帖子将不可恢复（进入回收站），确定删除吗？', '删除帖子', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  try {
    await deletePost(postId.value);
    ElMessage.success('帖子已删除');
    router.push({ name: 'home' });
  } catch (e) {
    ElMessage.error(e instanceof Error ? e.message : '删除失败');
  }
}

onMounted(load);
</script>

<template>
  <div ref="rootRef" class="shell">
    <aside class="col-left">
      <BoardTree :boards="boards" :active-slug="post?.board.slug ?? ''" />
    </aside>

    <main class="col-main">
      <div v-if="loading" class="detail-skeleton">
        <div class="sk" style="width: 60%; height: 24px"></div>
        <div class="sk sk-row" style="width: 30%; height: 14px"></div>
        <div class="sk" style="height: 14px"></div>
        <div class="sk" style="height: 14px; width: 95%"></div>
        <div class="sk" style="height: 14px; width: 70%"></div>
      </div>

      <div v-else-if="loadError || !post" class="detail-skeleton error-box">
        <p>帖子不存在或已被删除</p>
        <RouterLink to="/"><el-button type="primary" plain>返回首页</el-button></RouterLink>
      </div>

      <template v-else>
        <article class="post-article">
          <div class="post-flags">
            <FlagBadge kind="custom" :text="post.board.name" />
            <FlagBadge v-if="post.isPinned" kind="pinned" />
            <FlagBadge v-if="post.isFeatured" kind="featured" />
            <FlagBadge v-if="post.status === 'SOLVED' || post.acceptedComment" kind="solved" />
            <FlagBadge v-if="post.status === 'PENDING'" kind="pending" />
            <FlagBadge v-if="post.status === 'LOCKED'" kind="locked" />
            <FlagBadge v-if="post.isAnonymous" kind="anonymous" />
          </div>
          <h1 class="post-title-h1">{{ post.title }}</h1>
          <div class="post-byline">
            <UserLink
              :name="post.isAnonymous ? '匿名用户' : (post.author?.displayName ?? '已注销')"
              :username="post.isAnonymous ? null : post.author?.username"
              :avatar-url="post.isAnonymous ? null : post.author?.avatarUrl"
              :user-id="post.isAnonymous ? -post.id : post.author?.id"
              :anonymous="post.isAnonymous"
              :size="32"
            />
            <span class="tw-meta">发布于 {{ formatTime(post.createdAt) }}</span>
            <span v-if="post.editCount > 0" class="tw-meta">编辑于 {{ timeAgo(post.editedAt ?? post.createdAt) }}（{{ post.editCount }} 次）</span>
            <span v-if="post.isAnonymous && post.realAuthorVisible && post.realAuthor" class="tw-meta admin-note">
              真实作者：{{ post.realAuthor.displayName }}
            </span>
            <span class="byline-actions">
              <RouterLink v-if="isAuthor" :to="{ name: 'post-edit', params: { id: post.id } }">
                <el-button size="small" text type="primary">编辑</el-button>
              </RouterLink>
              <el-button v-if="isAuthor || session.user?.role === 'SUPER_ADMIN'" size="small" text type="danger" @click="onDeletePost">删除</el-button>
            </span>
          </div>

          <ContentRenderer :content="post.content" />

          <div class="post-actions">
            <LikeToggle target-type="POST" :target-id="post.id" :liked="post.viewerLiked" :count="post.likeCount" />
            <BookmarkToggle :post-id="post.id" :bookmarked="post.viewerBookmarked" :count="post.bookmarkCount" />
            <el-button
              v-if="session.user && !isAuthor"
              size="small"
              text
              type="danger"
              @click="reportVisible = true"
            >
              举报
            </el-button>
            <span class="tw-meta">浏览 {{ formatCount(post.viewCount) }}</span>
          </div>
        </article>

        <ReportDialog
          v-model:visible="reportVisible"
          target-type="POST"
          :target-id="post.id"
          :target-label="post.title"
        />

        <!-- 采纳答案块（设计规范 §4.3） -->
        <section v-if="post.acceptedComment" class="accepted-block">
          <header class="accepted-head">
            已采纳的最佳答案
            <span class="accepted-answerer">
              答主：{{
                post.acceptedComment.isAnonymous
                  ? '匿名用户'
                  : (post.acceptedComment.author?.displayName ?? '')
              }}
            </span>
          </header>
          <div class="accepted-body">
            <p class="accepted-content">{{ post.acceptedComment.content }}</p>
            <div class="accepted-foot tw-meta">{{ formatTime(post.acceptedComment.createdAt) }}</div>
          </div>
        </section>

        <section class="comments-section" id="comments">
          <h2 class="section-title">评论 <span class="tw-meta">{{ post.commentCount }}</span></h2>
          <div id="comment-editor-box">
            <CommentEditor v-if="session.user?.emailVerified && post.status !== 'LOCKED'" :post-id="post.id" @posted="onCommentPosted" />
            <p v-else-if="post.status === 'LOCKED'" class="locked-note">帖子已锁定，评论已关闭</p>
            <p v-else class="locked-note">
              <RouterLink :to="{ name: 'verify-email', query: { email: session.user?.email } }">完成邮箱验证</RouterLink>
              或
              <RouterLink :to="{ name: 'login' }">登录</RouterLink>
              后参与讨论
            </p>
          </div>

          <div v-if="replyTarget" class="replying-banner">
            正在回复：<b>{{ replyTarget.isAnonymous ? '匿名用户' : (replyTarget.author?.displayName ?? '') }}</b>
            <button type="button" class="cancel-reply" @click="replyTarget = null">取消</button>
          </div>
          <div v-if="replyTarget" class="reply-editor">
            <CommentEditor
              :post-id="post.id"
              :parent-id="replyTarget.id"
              :reply-to-user-id="replyTarget.isTop ? null : (replyTarget.author?.id ?? null)"
              :placeholder="replyPlaceholder()"
              :auto-focus="true"
              @posted="onReplyPosted"
            />
          </div>

          <CommentList
            :nodes="comments"
            :post-id="post.id"
            :can-accept="canAccept"
            :accepted-id="acceptedCommentId"
            @reply="onReply"
            @deleted="onCommentDeleted"
            @accept="onAccept"
          />
        </section>
      </template>
    </main>

    <aside class="col-right rail">
      <section class="panel">
        <h3 class="panel-title">帖子数据</h3>
        <ul v-if="post" class="stat-list">
          <li><span class="stat-num">{{ post.viewCount }}</span><span class="stat-label">浏览</span></li>
          <li><span class="stat-num">{{ post.likeCount }}</span><span class="stat-label">点赞</span></li>
          <li><span class="stat-num">{{ post.commentCount }}</span><span class="stat-label">评论</span></li>
          <li><span class="stat-num">{{ post.bookmarkCount }}</span><span class="stat-label">收藏</span></li>
        </ul>
      </section>
      <section v-if="post?.course" class="panel">
        <h3 class="panel-title">关联课程</h3>
        <p class="course-name">{{ post.course.name }}</p>
        <p class="course-meta tw-meta">{{ post.course.code }} · {{ post.course.department }}{{ post.course.teacher ? ` · ${post.course.teacher}` : '' }}</p>
      </section>
      <section class="panel">
        <h3 class="panel-title">板块说明</h3>
        <p class="board-desc">{{ boards.find((b) => b.slug === post?.board.slug)?.description ?? '文明发帖，理性讨论' }}</p>
      </section>
    </aside>
  </div>
</template>

<style scoped>
.shell {
  max-width: var(--tw-page-max);
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: grid;
  grid-template-columns: var(--tw-col-left) minmax(0, 1fr) var(--tw-col-right);
  gap: var(--tw-col-gap);
  align-items: start;
}

.col-left {
  position: sticky;
  top: var(--tw-sticky-top);
}

.col-right.rail {
  position: sticky;
  top: var(--tw-sticky-top);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.post-article,
.comments-section {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 22px 26px;
}

.comments-section {
  margin-top: 14px;
}

.detail-skeleton {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 300px;
}

.error-box {
  align-items: center;
  text-align: center;
  gap: 14px;
}

.post-flags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.post-title-h1 {
  margin: 0 0 12px;
  font-size: var(--tw-fs-display);
  line-height: var(--tw-lh-display);
  font-weight: 600;
  color: var(--tw-ink);
}

.post-byline {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--tw-line);
  margin-bottom: 18px;
}

.byline-actions {
  margin-left: auto;
  display: inline-flex;
  gap: 4px;
}

.admin-note {
  color: var(--tw-warning);
}

.post-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--tw-line);
}

.accepted-block {
  margin-top: 14px;
  border: 1px solid #bfdcd5;
  background: #f4faf8;
  border-radius: var(--tw-r-card);
}

.accepted-head {
  padding: 13px 22px;
  border-bottom: 1px solid #bfdcd5;
  color: #1d6b52;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.accepted-answerer {
  background: var(--tw-accent-soft);
  color: var(--tw-accent-ink);
  border-radius: var(--tw-r-pill);
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 500;
}

.accepted-body {
  padding: 18px 20px;
}

.accepted-content {
  margin: 0;
  font-size: var(--tw-fs-body);
  line-height: var(--tw-lh-body);
  color: var(--tw-ink-read);
  white-space: pre-wrap;
  word-break: break-word;
}

.accepted-foot {
  margin-top: 10px;
}

.section-title {
  margin: 0 0 14px;
  font-size: var(--tw-fs-title-lg);
  font-weight: 600;
  color: var(--tw-ink);
}

#comment-editor-box {
  margin-bottom: 16px;
}

.locked-note {
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-3);
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-ctrl);
  padding: 12px 14px;
  margin: 0;
}

.locked-note a {
  color: var(--tw-accent);
}

.replying-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  background: var(--tw-accent-soft);
  border-radius: var(--tw-r-ctrl);
  padding: 8px 12px;
  margin-bottom: 8px;
}

.cancel-reply {
  margin-left: auto;
  color: var(--tw-accent);
  font-size: 12.5px;
}

.reply-editor {
  margin-bottom: 16px;
}

.panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: var(--tw-panel-pad);
}

.panel-title {
  margin: 2px 0 11px;
  font-size: var(--tw-fs-label);
  font-weight: 600;
  letter-spacing: 0.05em;
  color: var(--tw-ink-2);
}

.stat-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stat-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-num {
  font-family: var(--tw-font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--tw-ink);
}

.stat-label {
  font-size: 11.5px;
  color: var(--tw-ink-3);
}

.course-name {
  margin: 0;
  font-weight: 600;
  color: var(--tw-ink);
}

.course-meta {
  margin: 4px 0 0;
}

.board-desc {
  margin: 0;
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-2);
  line-height: var(--tw-lh-caption);
}

.sk {
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-ctrl);
}

.sk-row {
  width: 30%;
}

@media (max-width: 1180px) {
  .col-right.rail {
    display: none;
  }
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
    padding: 16px 18px 60px;
  }

  .col-left {
    position: static;
  }

  .col-left :deep(.navcard) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 4px;
    overflow-x: auto;
    padding: 8px;
  }

  .col-left :deep(.nav-h),
  .col-left :deep(.nav-div) {
    display: none;
  }

  .col-left :deep(.nav-i) {
    flex: none;
    height: 32px;
  }

  .col-left :deep(.cnt) {
    display: none;
  }

  .post-article,
  .comments-section {
    padding: 18px 16px;
  }
}
</style>
