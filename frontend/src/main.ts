import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 样式引入顺序（开发文档 §3.1 / theme.css 头注）：Element Plus 基础样式 → 设计令牌 → Element Plus 覆写 → 页面级样式
import 'element-plus/dist/index.css';
import '@/styles/theme.css';
import '@/styles/element-override.css';
import '@/styles/auth.css';

createApp(App).use(createPinia()).use(router).mount('#app');
