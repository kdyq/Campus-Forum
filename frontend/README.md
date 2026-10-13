# 同窗 · 前端应用

校园话题社区「同窗」的 Web 前端：Vue 3 + TypeScript + Vite 6 + Element Plus，配套「公告栏」方向的设计令牌体系（浅色为主 + 完整深色模式）。

## 技术要点

- **框架**：Vue 3 组合式 API + `<script setup>`，Pinia 状态，Vue Router 4（登录 / 邮箱验证 / 管理员三类守卫）
- **UI**：Element Plus 按需引入（`unplugin-auto-import` + `unplugin-vue-components`），主题经 **CSS 变量覆写**（不编译 SCSS 变量），深色模式由 `html.dark` 作用域下重写 `--el-*` 变量驱动
- **设计令牌**：`src/styles/theme.css`（色彩 / 字阶 / 间距 / 圆角 / 阴影 / 动效，含 `[data-theme="dark"]` 分支）与 `src/styles/element-override.css`（Element Plus 全量变量映射）
- **编辑器**：md-editor-v3（Markdown + 图片粘贴上传 + 实时预览）
- **动效**：GSAP 页面入场（`gsap.context` + `matchMedia` 降级 `prefers-reduced-motion`），仅动 transform / opacity，无 scroll 监听（滚动追加用 IntersectionObserver）
- **网络**：axios 封装——统一包络解析、401 静默刷新并重放、业务错误归一为 `ApiError`；Socket.IO Client 实时通知

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # vue-tsc 类型检查 + 生产构建
npm run preview    # 预览构建产物
```

开发代理（`vite.config.ts`）：`/api`、`/uploads` 与 `/socket.io`（含 WebSocket）均代理到后端 **http://localhost:3100**（后端端口可在 `backend/.env` 修改后同步调整）。

## 目录结构

```
src/
├── main.ts                 # 入口：样式引入顺序（EP → 深色变量 → 令牌 → 覆写）、首屏主题
├── App.vue                 # 顶栏（搜索/通知铃铛/主题切换/用户菜单）+ 移动端悬浮发帖
├── api/                    # client.ts（axios 封装）与按域接口（content/discover/admin/course）
├── components/             # PostItem、评论楼中楼、投票框、骨架屏、热榜、举报弹窗…
├── composables/            # useInfiniteScroll（IntersectionObserver）、useEntrance（GSAP）
├── router/                 # 路由与三类守卫（requiresAuth / requiresVerified / requiresAdmin）
├── stores/                 # session（内存 access token + 静默恢复）、notification（未读 + Socket）
├── styles/                 # theme.css 设计令牌、element-override.css、auth.css
├── types/                  # 与后端共享的类型
├── utils/                  # 校验规则（与后端同源）、时间/计数格式化
└── views/                  # 首页/板块、帖子详情、编辑器、搜索、标签、用户主页、
                            # 通知、课程主页、登录注册四页、admin/（看板/举报/内容/用户/敏感词/日志）
```

## 样式约定

- 页面底色 `--tw-bg`，容器 `--tw-surface` + 1px 发丝线；阴影只用于真正浮起的元素
- 元数据（时间、计数）一律等宽字体 `--tw-font-mono`
- 交互元素五态齐全（hover / active / focus-visible / disabled / loading），焦点环全局统一
- 断点 640 / 860 / 1180 / 1320：1180 以下隐藏右栏，860 以下单栏 + 板块横滑胶囊，640 以下收紧顶栏并启用悬浮发帖按钮
