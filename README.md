# 同窗 · 校园话题社区

面向校园内部的话题社区：发帖求助、交流课程、分享信息。注册受校园身份约束，内容有治理，讨论能沉淀。

| 文档 | 职责 |
|---|---|
| [开发文档.md](开发文档.md) | 工程侧唯一依据：约束、技术栈、数据模型、接口、分期、验收 |
| [设计规范.md](设计规范.md) | 视觉与交互唯一依据 |
| `design/` | 设计稿、设计令牌与截图（方向 B「公告栏」） |

## 技术栈

- **前端** `frontend/`：Vue 3 + TypeScript + Vite 6 + Element Plus（CSS 变量覆写）+ Pinia + Vue Router
- **后端** `backend/`：Express 4 + TypeScript（Node 24 原生运行，无构建步骤）+ Zod + Prisma 6（锁定，勿升 7）+ MySQL 8 + Redis + Nodemailer

## 本地启动

环境要求：Node ≥ 24、MySQL 8、Redis（本机 6379）。数据库密码与 QQ 邮箱 SMTP 配置在 `backend/.env`（不提交，模板见 `backend/.env.example`）。

```bash
# 1) 后端
cd backend
npm install
# 建库（仅首次；使用全新数据库，不复用已有库）
mysql -uroot -p -e "CREATE DATABASE IF NOT EXISTS campus_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
npx prisma migrate dev   # 应用迁移（含 ngram 中文全文索引）
npm run seed             # 种子数据
npm run dev              # http://localhost:3000

# 2) 前端（新终端）
cd frontend
npm install
npm run dev              # http://localhost:5173（/api、/uploads 代理到 3000）
```

## 种子账号与测试

| 项 | 值 |
|---|---|
| 超级管理员 | `guo` / `123456`（种子直建、邮箱已认证；**仅限开发，上线前必须替换**） |
| 演示用户（8 位） | 用户名见 `backend/prisma/seed.ts`，密码统一 `demo123456` |
| 邀请码 | `CAMPUS2026`（100 次）、`XINSHENG88`（50 次） |

- 注册流程：填邮箱 → 获取验证码（QQ 邮箱 SMTP 发送）→ 提交注册 → 邮箱验证页输入验证码完成认证（认证通过才能发帖评论，第 2 步启用该限制的入口）。
- 后端冒烟测试：`cd backend && npm run smoke`（覆盖注册/验证码/登录锁定/改密/token 轮换/登出等 25 项）。

## 开发进度

- [x] 第 1 步：骨架与账号（Prisma 模型与迁移、种子、注册登录 JWT、白名单与邀请码、设计令牌落地）
- [ ] 第 2 步：内容闭环（发帖、评论、采纳、点赞收藏、板块页、首页排序）
- [ ] 第 3 步：发现与治理（搜索、热榜、敏感词、限流沙箱、举报后台）
- [ ] 第 4 步：通知与体验（Socket.IO、关注、等级徽章、移动端）
- [ ] 第 5 步：课程库（差异化）
- [ ] 第 6 步：视觉验收
