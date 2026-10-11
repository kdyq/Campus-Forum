<script setup lang="ts">
// 管理后台独立布局（设计规范 §4.5）：不套用表现力约束，Element Plus 默认密度
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();

const MENU = [
  { index: '/admin', label: '数据看板', icon: '▤' },
  { index: '/admin/reports', label: '举报队列', icon: '⚑' },
  { index: '/admin/posts', label: '内容管理', icon: '▦' },
  { index: '/admin/users', label: '用户管理', icon: '☺' },
  { index: '/admin/sensitive-words', label: '敏感词库', icon: '✂' },
  { index: '/admin/audit-logs', label: '操作日志', icon: '☰' },
];

const activeIndex = computed(() => '/' + (route.path.split('/')[2] ?? ''));

const IS_ADMIN = computed(() => {
  const role = session.user?.role;
  return role === 'SUPER_ADMIN' || role === 'MODERATOR';
});

watchEffect(() => {
  if (!IS_ADMIN.value) {
    ElMessage.error('需要管理员权限');
    router.replace({ name: 'home' });
  }
});
</script>

<template>
  <div v-if="IS_ADMIN" class="admin-layout">
    <aside class="admin-aside">
      <div class="admin-brand">
        <span class="brand-mark">同</span>
        <span>管理后台</span>
      </div>
      <el-menu :default-active="activeIndex" class="admin-menu" router>
        <el-menu-item v-for="m in MENU" :key="m.index" :index="m.index">
          <span class="menu-ico" aria-hidden="true">{{ m.icon }}</span>
          <span>{{ m.label }}</span>
        </el-menu-item>
      </el-menu>
      <div class="admin-foot">
        <RouterLink to="/" class="back-link">← 返回社区</RouterLink>
      </div>
    </aside>
    <main class="admin-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  min-height: calc(100vh - var(--tw-topbar-h));
}

.admin-aside {
  border-right: 1px solid var(--tw-line);
  background: var(--tw-surface);
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: var(--tw-topbar-h);
  height: calc(100vh - var(--tw-topbar-h));
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--tw-ink);
  padding: 4px 10px 16px;
}

.brand-mark {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--tw-accent);
  color: var(--tw-btn-on-accent);
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
}

.admin-menu {
  border-right: none;
  flex: 1;
}

.menu-ico {
  margin-right: 8px;
  color: var(--tw-ink-3);
}

.admin-foot {
  padding: 10px;
}

.back-link {
  font-size: var(--tw-fs-caption);
  color: var(--tw-ink-3);
}

.back-link:hover {
  color: var(--tw-accent);
}

.admin-main {
  padding: 22px 28px;
  min-width: 0;
}
</style>
