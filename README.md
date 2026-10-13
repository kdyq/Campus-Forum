# 同窗 · 校园话题社区

面向校园内部的话题社区：发帖求助、交流课程、分享信息。注册受校园身份约束，内容有治理，讨论能沉淀。

| 文档 | 职责 |
|---|---|
| [开发文档.md](开发文档.md) | 工程侧唯一依据：约束、技术栈、数据模型、接口、分期、验收 |
| [设计规范.md](设计规范.md) | 视觉与交互唯一依据 |
| `design/` | 设计稿、设计令牌与截图（方向 B「公告栏」） |

## 技术栈

- **前端** `frontend/`：Vue 3 + TypeScript + Vite 6 + Element Plus（CSS 变量覆写，含深色模式）+ Pinia + Vue Router + md-editor-v3 + GSAP + Socket.IO Client
- **后端** `backend/`：Express 4 + TypeScript（Node 24 原生运行，无构建步骤）+ Zod + Prisma 6（锁定，勿升 7）+ MySQL 8（ngram 全文索引）+ Redis（限流/热榜/浏览去重）+ Socket.IO + Nodemailer

## 已实现功能（第 1-6 步全部完成）

- **账号**：教育邮箱白名单/邀请码注册、邮箱验证码（QQ SMTP）、登录失败锁定、JWT 双令牌轮换、昵称头像、忘记密码
- **内容**：Markdown 发帖（图片粘贴上传、标签、匿名、草稿自动保存）、编辑历史（30 分钟免历史）、两级评论与楼中楼、采纳最佳答案、点赞收藏、板块页、首页最新/热门/精华/关注四种排序
- **发现与治理**：ngram 全文搜索、标签广场与聚合页、用户主页（帖子/评论/收藏/点赞）、热榜（Redis ZSET 每 10 分钟重算）、敏感词过滤（BLOCK/REVIEW）、新账号沙箱（24h 内发帖先审后显）、内容频率限制、举报闭环与管理后台（看板/举报队列/内容管理含回收站/用户管理/敏感词库/审计日志）
- **通知与体验**：Socket.IO 实时通知与未读角标、通知中心（类型筛选/批量已读）、关注与粉丝、等级经验徽章、投票问卷、深色模式、移动端适配（横滑板块、悬浮发帖按钮）
- **课程库**：课程主页聚合讨论、结构化评分（综合/作业量/点名/推荐，提交即更新聚合）、编辑器关联课程、从课程页一键发帖

## 本地启动

环境要求：Node ≥ 24、MySQL 8、Redis（本机 6379）。数据库密码与 QQ 邮箱 SMTP 配置在 `backend/.env`（不提交，模板见 `backend/.env.example`）。

```bash
# 1) 后端
cd backend
npm install
# 建库（仅首次；使用全新数据库，不复用已有库）
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS campus_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
npx prisma migrate dev   # 应用迁移（含 ngram 中文全文索引、投票表）
npm run seed             # 种子数据
npm run dev              # http://localhost:3100（WebSocket 同端口；本机 3000 常被占用，故用 3100）

# 2) 前端（新终端）
cd frontend
npm install
npm run dev              # http://localhost:5173（/api、/uploads、/socket.io 代理到 3100）
```

**邮件服务开关**：`backend/.env` 中的 `TEST_MODE` 控制验证码是否真实发送——

- `TEST_MODE=1`：验证码只写入 Redis、不实发邮件，控制台打印验证码。跑 `npm run smoke` 与自动化测试时用它（零邮件，防 QQ 邮箱封禁）。
- `TEST_MODE=0`：真实发送验证码邮件（人工注册联调、真实使用时）。

改完开关需重启后端生效。SMTP 通道可用性可用 `node --experimental-strip-types scripts/verify-smtp.mjs` 验证（只做连接与鉴权，不发任何邮件）。生产环境必须为 `0`。

## 种子账号与测试

| 项 | 值 |
|---|---|
| 超级管理员 | `guo` / `123456`（种子直建、邮箱已认证；**仅限开发，上线前必须替换**） |
| 演示用户（8 位） | 用户名见 `backend/prisma/seed.ts`，密码统一 `demo123456` |
| 邀请码 | `CAMPUS2026`（100 次）、`XINSHENG88`（50 次） |

- 注册流程：填邮箱 → 获取验证码 → 提交注册 → 邮箱验证页输入验证码完成认证（认证通过才能发帖评论）。
- 后端冒烟测试：`cd backend && npm run smoke`（覆盖 1-5 步全链路 96 项断言；`TEST_MODE=1` 下不发送真实邮件）。

## 开发进度

- [x] 第 1 步：骨架与账号（Prisma 模型与迁移、种子、注册登录 JWT、白名单与邀请码、设计令牌落地）
- [x] 第 2 步：内容闭环（发帖、评论、采纳、点赞收藏、板块页、首页排序）
- [x] 第 3 步：发现与治理（搜索、热榜、敏感词、限流沙箱、举报后台）
- [x] 第 4 步：通知与体验（Socket.IO、关注、等级徽章、投票、移动端、深色模式）
- [x] 第 5 步：课程库（差异化）
- [x] 第 6 步：视觉验收（状态矩阵、375/1180 断点无横向滚动、深色对比度、焦点环）

## 已知注意事项

- 全文索引依赖迁移中的 ngram 定义 + 启动时 `ensureFulltextIndex()` 幂等兜底；重跑种子后热榜 ZSET 会自动重算。
- 深色模式下 Element Plus 变量在 `frontend/src/styles/element-override.css` 的 `html.dark` 段覆写（EP 自带 dark 变量会反超 `:root` 覆写）。
- 上传目录 `backend/uploads/`（gitignored）。F 盘空间紧张，必要时将 `UPLOAD` 目录迁至 D 盘。
