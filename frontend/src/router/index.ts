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
    { path: '/u/:username', name: 'user', component: () => import('@/views/StubView.vue'), props: { title: '个人主页正在建设中' } },
    { path: '/tags', name: 'tags', component: () => import('@/views/StubView.vue'), props: { title: '标签广场正在建设中' } },
    { path: '/tags/:slug', name: 'tag', component: () => import('@/views/StubView.vue'), props: { title: '标签聚合页正在建设中' } },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue'), meta: { guestOnly: true } },
    { path: '/verify-email', name: 'verify-email', component: () => import('@/views/VerifyEmailView.vue') },
    { path: '/forgot-password', name: 'forgot-password', component: () => import('@/views/ForgotPasswordView.vue'), meta: { guestOnly: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const session = useSessionStore();
  await session.ensureLoaded();
  if (to.meta.guestOnly && session.user) return { name: 'home' };
  if ((to.meta.requiresAuth || to.meta.requiresVerified) && !session.user) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.requiresVerified && session.user && !session.user.emailVerified) {
    return { name: 'verify-email', query: { email: session.user.email } };
  }
});

export default router;
