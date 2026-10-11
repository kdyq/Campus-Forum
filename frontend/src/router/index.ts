import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/b/:slug', name: 'board', component: () => import('@/views/HomeView.vue') },
    { path: '/p/new', name: 'post-new', component: () => import('@/views/PostEditorView.vue'), meta: { requiresVerified: true } },
    { path: '/p/:id(\\d+)', name: 'post-detail', component: () => import('@/views/PostDetailView.vue') },
    { path: '/p/:id(\\d+)/edit', name: 'post-edit', component: () => import('@/views/PostEditorView.vue'), meta: { requiresAuth: true } },
    { path: '/search', name: 'search', component: () => import('@/views/SearchView.vue') },
    { path: '/u/:username', name: 'user', component: () => import('@/views/UserProfileView.vue') },
    { path: '/tags', name: 'tags', component: () => import('@/views/TagsView.vue') },
    { path: '/tags/:slug', name: 'tag', component: () => import('@/views/TagView.vue') },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guestOnly: true } },
    { path: '/verify-email', name: 'verify-email', component: () => import('@/views/VerifyEmailView.vue') },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/ForgotPasswordView.vue'), meta: { guestOnly: true } },
    {
      path: '/admin',
      component: () => import('@/views/admin/AdminLayout.vue'),
      meta: { requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: () => import('@/views/admin/AdminDashboard.vue') },
        { path: 'reports', name: 'admin-reports', component: () => import('@/views/admin/AdminReports.vue') },
        { path: 'posts', name: 'admin-posts', component: () => import('@/views/admin/AdminPosts.vue') },
        { path: 'users', name: 'admin-users', component: () => import('@/views/admin/AdminUsers.vue') },
        { path: 'sensitive-words', name: 'admin-sensitive', component: () => import('@/views/admin/AdminSensitive.vue') },
        { path: 'audit-logs', name: 'admin-audit', component: () => import('@/views/admin/AdminAudit.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  await session.ensureLoaded();
  if (to.meta.guestOnly && session.user) return { name: 'home' };
  if ((to.meta.requiresAuth || to.meta.requiresVerified || to.meta.requiresAdmin) && !session.user) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresVerified && session.user && !session.user.emailVerified) {
    return { name: 'verify-email', query: { email: session.user.email } };
  }
  if (to.meta.requiresAdmin) {
    const role = session.user?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'MODERATOR') {
      return { name: 'home' };
    }
  }
});

export default router;
