import { createRouter, createWebHistory } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
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
  if (to.meta.requiresAuth && !session.user) return { name: 'login', query: { redirect: to.fullPath } };
});

export default router;
