import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 样式引入顺序（项目规范 §3.1 / theme.css 头注）：Element Plus 基础样式 → 深色变量 → 设计令牌 → Element Plus 覆写 → 页面级样式
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css';
import '@/styles/theme.css';
import '@/styles/element-override.css';
import '@/styles/auth.css';

// 首屏主题：避免闪烁，先于挂载应用
const savedTheme = localStorage.getItem('tc-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  document.documentElement.dataset.theme = 'dark';
  document.documentElement.classList.add('dark');
}

createApp(App).use(createPinia()).use(router).mount('#app');
