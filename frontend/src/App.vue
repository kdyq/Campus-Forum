<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import UserAvatar from '@/components/UserAvatar.vue';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const router = useRouter();
const searchWord = ref('');

function onSearch() {
  const q = searchWord.value.trim();
  if (!q) return;
  router.push({ name: 'search', query: { q } });
  searchWord.value = '';
}

function goAdmin() {
  router.push({ name: 'admin-dashboard' });
}

async function onLogout() {
  await session.logout();
  ElMessage.success('已退出登录');
  router.push({ name: 'home' });
}

const isAdmin = () => {
  const role = session.user?.role;
  return role === 'SUPER_ADMIN' || role === 'MODERATOR';
};
</script>

<template>
  <el-config-provider :locale="zhCn">
    <div class="app">
      <header class="topbar tw-glass">
        <div class="topbar-in">
          <RouterLink to="/" class="brand" aria-label="同窗首页">
            <span class="brand-mark" aria-hidden="true">同</span>
            <span>同窗</span>
          </RouterLink>
          <nav class="nav" aria-label="主导航">
            <RouterLink to="/" class="nav-item" :class="{ on: $route.name === 'home' || $route.name === 'board' }">首页</RouterLink>
            <RouterLink to="/tags" class="nav-item" :class="{ on: $route.name === 'tags' || $route.name === 'tag' }">标签</RouterLink>
          </nav>
          <form class="search" role="search" @submit.prevent="onSearch">
            <span class="search-ico" aria-hidden="true">⌕</span>
            <input v-model="searchWord" class="search-input" type="search" placeholder="搜索帖子…" aria-label="搜索帖子" />
          </form>
          <div class="actions">
            <template v-if="session.user">
              <RouterLink to="/p/new" class="new-post-link">
                <el-button type="primary">发帖</el-button>
              </RouterLink>
              <el-dropdown trigger="click">
                <span class="user-chip" role="button" tabindex="0">
                  <UserAvatar
                    :name="session.user.displayName"
                    :url="session.user.avatarUrl"
                    :id="session.user.id"
                    :size="32"
                  />
                  <span class="user-name">{{ session.user.displayName }}</span>
                  <span v-if="!session.user.emailVerified" class="unverified-dot" title="邮箱未验证" />
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item disabled>
                      {{ session.user.emailVerified ? '已通过校园认证' : '邮箱未验证' }}
                    </el-dropdown-item>
                    <el-dropdown-item @click="router.push({ name: 'user', params: { username: session.user!.username } })">
                      我的主页
                    </el-dropdown-item>
                    <el-dropdown-item v-if="isAdmin()" divided @click="goAdmin">管理后台</el-dropdown-item>
                    <el-dropdown-item :divided="!isAdmin()" @click="onLogout">退出登录</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <template v-else>
              <RouterLink to="/login"><el-button text>登录</el-button></RouterLink>
              <RouterLink to="/register"><el-button type="primary">注册</el-button></RouterLink>
            </template>
          </div>
        </div>
      </header>
      <RouterView />
    </div>
  </el-config-provider>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--tw-z-sticky);
  height: var(--tw-topbar-h);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(14px) saturate(160%);
  border-bottom: 1px solid var(--tw-line);
}

.topbar-in {
  max-width: var(--tw-page-max);
  margin: 0 auto;
  height: 100%;
  padding: 0 var(--tw-page-pad);
  display: flex;
  align-items: center;
  gap: 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: var(--tw-ink);
}

.brand-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  flex: none;
  display: grid;
  place-items: center;
  background: var(--tw-accent);
  color: var(--tw-btn-on-accent);
  font-size: 14px;
  font-weight: 700;
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 100%;
}

/* 顶栏搜索框（设计稿方向 B）：640px 以下隐藏 */
.search {
  flex: 1;
  max-width: 440px;
  height: 38px;
  background: var(--tw-bg);
  border: 1px solid var(--tw-line);
  border-radius: var(--tw-r-ctrl);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 13px;
  transition: border-color var(--tw-dur-base) var(--tw-ease-out), background var(--tw-dur-base) var(--tw-ease-out);
}

.search:hover {
  border-color: var(--tw-line-strong);
  background: var(--tw-surface);
}

.search:focus-within {
  border-color: var(--tw-accent);
  box-shadow: 0 0 0 3px var(--tw-focus-ring);
}

.search-ico {
  color: var(--tw-ink-3);
  font-size: 15px;
}

.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: var(--tw-fs-body-sm);
  color: var(--tw-ink);
}

.search-input::placeholder {
  color: var(--tw-ink-3);
}

@media (max-width: 640px) {
  .search {
    display: none;
  }
}

.nav-item {
  display: inline-flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  font-size: 15px;
  color: var(--tw-ink-2);
  border-bottom: 2px solid transparent;
}

.nav-item:hover {
  color: var(--tw-ink);
}

.nav-item.on {
  color: var(--tw-ink);
  font-weight: 600;
  border-bottom-color: var(--tw-accent);
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: var(--tw-r-pill);
  cursor: pointer;
  position: relative;
  outline-offset: -2px;
}

.user-chip:hover {
  background: var(--tw-surface-2);
}

.user-name {
  font-size: 14px;
  color: var(--tw-ink);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unverified-dot {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 8px;
  height: 8px;
  border-radius: var(--tw-r-full);
  background: var(--tw-warning);
  border: 2px solid var(--tw-surface);
}
</style>
