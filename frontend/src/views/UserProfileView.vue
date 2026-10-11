<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import EmptyState from '@/components/EmptyState.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { fetchMyLikedPosts, fetchProfile, fetchUserComments, fetchUserPosts, type UserProfile } from '@/api/admin';
import { fetchBookmarks } from '@/api/content';
import { timeAgo } from '@/utils/format';
import type { BookmarkList, FeedItem } from '@/types/content';

const route = useRoute();
const username = computed(() => String(route.params.username ?? ''));

const profile = ref<UserProfile | null>(null);
const loading = ref(true);
const loadError = ref(false);
const tab = ref<'posts' | 'comments' | 'bookmarks' | 'likes'>('posts');

const posts = ref<Awaited<ReturnType<typeof fetchUserPosts>>['items']>([]);
const postsTotal = ref(0);
const comments = ref<Awaited<ReturnType<typeof fetchUserComments>>['items']>([]);
const commentsTotal = ref(0);
const bookmarks = ref<BookmarkList['items']>([]);
const likedPosts = ref<Awaited<ReturnType<typeof fetchMyLikedPosts>>['items']>([]);
const tabLoading = ref(false);

const LEVEL_EXP = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5600, 7500];
const levelProgress = computed(() => {
  if (!profile.value) return 0;
  const current = LEVEL_EXP[Math.min(profile.value.level - 1, LEVEL_EXP.length - 1)];
  const next = LEVEL_EXP[Math.min(profile.value.level, LEVEL_EXP.length - 1)];
  if (profile.value.level >= LEVEL_EXP.length) return 100;
  return Math.min(100, Math.round(((profile.value.exp - current) / Math.max(next - current, 1)) * 100));
});

async function loadProfile() {
  loading.value = true;
  loadError.value = false;
  try {
    profile.value = await fetchProfile(username.value);
    document.title = `${profile.value.displayName} · 同窗`;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadTab() {
  if (!profile.value) return;
  tabLoading.value = true;
  try {
    if (tab.value === 'posts') {
      const r = await fetchUserPosts(username.value);
      posts.value = r.items;
      postsTotal.value = r.total;
    } else if (tab.value === 'comments') {
      const r = await fetchUserComments(username.value);
      comments.value = r.items;
      commentsTotal.value = r.total;
    } else if (tab.value === 'bookmarks') {
      const r = await fetchBookmarks();
      bookmarks.value = r.items;
    } else {
      const r = await fetchMyLikedPosts();
      likedPosts.value = r.items;
    }
  } catch {
    ElMessage.error('加载失败');
  } finally {
    tabLoading.value = false;
  }
}

watch(tab, loadTab);
watch(username, () => {
  tab.value = 'posts';
  void loadProfile().then(loadTab);
});

onMounted(() => {
  void loadProfile().then(loadTab);
});
</script>

<template>
  <main class="page">
    <div v-if="loading" class="profile-card"><p class="loading-hint">加载中…</p></div>
    <div v-else-if="loadError || !profile" class="profile-card">
      <EmptyState icon="?" title="用户不存在" description="该用户可能已被封禁或注销">
        <template #actions><RouterLink to="/"><el-button type="primary" plain>返回首页</el-button></RouterLink></template>
      </EmptyState>
    </div>
    <template v-else>
      <!-- 资料卡 -->
      <section class="profile-card">
        <div class="profile-head">
          <UserAvatar :name="profile.displayName" :url="profile.avatarUrl" :id="profile.id" :size="64" />
          <div class="profile-main">
            <div class="profile-name-row">
              <h1 class="profile-name">{{ profile.displayName }}</h1>
              <span class="level-badge">Lv.{{ profile.level }}</span>
              <span v-if="profile.role === 'SUPER_ADMIN'" class="role-badge admin">站长</span>
              <span v-else-if="profile.role === 'MODERATOR'" class="role-badge mod">版主</span>
              <span v-if="profile.status === 'MUTED'" class="role-badge muted">已禁言</span>
            </div>
            <p v-if="profile.bio" class="profile-bio">{{ profile.bio }}</p>
            <p class="profile-meta tw-meta">
              @{{ profile.username }} · 加入于 {{ timeAgo(profile.createdAt) }}
              <template v-if="profile.college"> · {{ profile.college }}</template>
              <template v-if="profile.grade"> {{ profile.grade }}</template>
              <template v-if="profile.major"> · {{ profile.major }}</template>
            </p>
            <div class="level-progress">
              <div class="progress-track"><div class="progress-fill" :style="{ width: `${levelProgress}%` }"></div></div>
              <span class="tw-meta">经验 {{ profile.exp }}</span>
            </div>
          </div>
          <dl class="profile-stats">
            <div><dt>帖子</dt><dd>{{ profile.stats.postCount }}</dd></div>
            <div><dt>评论</dt><dd>{{ profile.stats.commentCount }}</dd></div>
            <div><dt>获赞</dt><dd>{{ profile.stats.likeReceived }}</dd></div>
            <div><dt>采纳</dt><dd>{{ profile.stats.acceptedCount }}</dd></div>
          </dl>
        </div>
      </section>

      <!-- Tabs -->
      <section class="tabs-panel">
        <div class="tabs" role="tablist">
          <button role="tab" :aria-selected="tab === 'posts'" class="tab" :class="{ on: tab === 'posts' }" @click="tab = 'posts'">帖子</button>
          <button role="tab" :aria-selected="tab === 'comments'" class="tab" :class="{ on: tab === 'comments' }" @click="tab = 'comments'">评论</button>
          <button v-if="profile.isSelf" role="tab" :aria-selected="tab === 'bookmarks'" class="tab" :class="{ on: tab === 'bookmarks' }" @click="tab = 'bookmarks'">收藏</button>
          <button v-if="profile.isSelf" role="tab" :aria-selected="tab === 'likes'" class="tab" :class="{ on: tab === 'likes' }" @click="tab = 'likes'">点赞</button>
        </div>

        <div v-if="tabLoading" class="tab-loading">加载中…</div>

        <!-- 帖子 Tab -->
        <div v-else-if="tab === 'posts'" class="tab-body">
          <RouterLink v-for="p in posts" :key="p.id" :to="{ name: 'post-detail', params: { id: p.id } }" class="row-item">
            <div class="row-main">
              <span class="row-title">{{ p.title }}</span>
              <span class="row-meta tw-meta">{{ p.boardName }} · {{ timeAgo(p.createdAt) }} · 赞 {{ p.likeCount }} · 评论 {{ p.commentCount }}</span>
            </div>
            <span v-if="p.status === 'PENDING'" class="flag-mini warning">待审核</span>
            <span v-else-if="p.status === 'REMOVED'" class="flag-mini danger">已下架</span>
          </RouterLink>
          <p v-if="posts.length === 0" class="tab-empty">还没有发过帖子</p>
        </div>

        <!-- 评论 Tab -->
        <div v-else-if="tab === 'comments'" class="tab-body">
          <RouterLink v-for="c in comments" :key="c.id" :to="{ name: 'post-detail', params: { id: c.post.id } }" class="row-item">
            <div class="row-main">
              <span class="row-content">{{ c.content }}</span>
              <span class="row-meta tw-meta">在「{{ c.post.title }}」下 · {{ timeAgo(c.createdAt) }} · 赞 {{ c.likeCount }}</span>
            </div>
          </RouterLink>
          <p v-if="comments.length === 0" class="tab-empty">还没有发表过评论</p>
        </div>

        <!-- 收藏 Tab -->
        <div v-else-if="tab === 'bookmarks'" class="tab-body">
          <RouterLink v-for="b in bookmarks" :key="`${b.post.id}`" :to="{ name: 'post-detail', params: { id: b.post.id } }" class="row-item">
            <div class="row-main">
              <span class="row-title">{{ b.post.title }}</span>
              <span class="row-meta tw-meta">收藏于 {{ timeAgo(b.savedAt) }}</span>
            </div>
          </RouterLink>
          <p v-if="bookmarks.length === 0" class="tab-empty">还没有收藏任何帖子</p>
        </div>

        <!-- 点赞 Tab -->
        <div v-else class="tab-body">
          <RouterLink v-for="l in likedPosts" :key="l.id" :to="{ name: 'post-detail', params: { id: l.id } }" class="row-item">
            <div class="row-main">
              <span class="row-title">{{ l.title }}</span>
              <span class="row-meta tw-meta">{{ l.boardName }} · 点赞于 {{ timeAgo(l.likedAt) }}</span>
            </div>
          </RouterLink>
          <p v-if="likedPosts.length === 0" class="tab-empty">还没有点赞过帖子</p>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page {
  max-width: 860px;
  margin: 0 auto;
  padding: 20px var(--tw-page-pad) 60px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-card,
.tabs-panel {
  background: var(--tw-surface);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-card);
  padding: 22px 26px;
}

.loading-hint {
  text-align: center;
  color: var(--tw-ink-3);
  margin: 0;
  padding: 20px 0;
}

.profile-head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.profile-main {
  flex: 1;
  min-width: 0;
}

.profile-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.profile-name {
  margin: 0;
  font-size: var(--tw-fs-title-lg);
  font-weight: 600;
  color: var(--tw-ink);
}

.level-badge {
  font-family: var(--tw-font-mono);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--tw-btn-on-accent);
  background: var(--tw-accent);
  border-radius: var(--tw-r-badge);
  padding: 2px 7px;
}

.role-badge {
  font-size: 10.5px;
  font-weight: 600;
  border-radius: var(--tw-r-badge);
  padding: 2px 7px;
}

.role-badge.admin {
  color: var(--tw-danger);
  background: var(--tw-danger-soft);
}

.role-badge.mod {
  color: var(--tw-accent-ink);
  background: var(--tw-accent-soft);
}

.role-badge.muted {
  color: var(--tw-warning);
  background: var(--tw-warning-soft);
}

.profile-bio {
  margin: 8px 0 0;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
}

.profile-meta {
  margin: 6px 0 0;
  display: block;
}

.level-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.progress-track {
  flex: 1;
  max-width: 260px;
  height: 5px;
  background: var(--tw-surface-2);
  border-radius: var(--tw-r-pill);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--tw-accent);
  border-radius: var(--tw-r-pill);
  transition: width var(--tw-dur-slow) var(--tw-ease-out);
}

.profile-stats {
  display: flex;
  gap: 22px;
  margin: 0;
  flex: none;
}

.profile-stats div {
  text-align: center;
}

.profile-stats dt {
  font-size: 11.5px;
  color: var(--tw-ink-3);
  margin-bottom: 4px;
}

.profile-stats dd {
  margin: 0;
  font-family: var(--tw-font-mono);
  font-size: 18px;
  font-weight: 600;
  color: var(--tw-ink);
}

.tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--tw-line);
  margin-bottom: 8px;
}

.tab {
  height: 40px;
  padding: 0 16px;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink-2);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--tw-dur-fast) var(--tw-ease-out);
}

.tab:hover {
  color: var(--tw-ink);
}

.tab.on {
  color: var(--tw-accent);
  font-weight: 600;
  border-bottom-color: var(--tw-accent);
}

.tab-loading {
  text-align: center;
  color: var(--tw-ink-3);
  padding: 24px 0;
}

.tab-body {
  display: flex;
  flex-direction: column;
}

.row-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 6px;
}

.row-item + .row-item {
  border-top: 1px solid var(--tw-line);
}

.row-item:hover .row-title,
.row-item:hover .row-content {
  color: var(--tw-accent-ink);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.row-title {
  font-size: var(--tw-fs-body);
  font-weight: 500;
  color: var(--tw-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-content {
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.row-meta {
  font-size: 11.5px;
}

.flag-mini {
  flex: none;
  font-size: 10.5px;
  font-weight: 600;
  border-radius: var(--tw-r-badge);
  padding: 2px 7px;
}

.flag-mini.warning {
  color: var(--tw-warning);
  background: var(--tw-warning-soft);
}

.flag-mini.danger {
  color: var(--tw-danger);
  background: var(--tw-danger-soft);
}

.tab-empty {
  text-align: center;
  color: var(--tw-ink-3);
  font-size: var(--tw-fs-body-sm);
  padding: 32px 0;
}

@media (max-width: 640px) {
  .profile-head {
    flex-direction: column;
  }

  .profile-stats {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
