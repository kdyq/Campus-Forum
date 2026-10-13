# 同窗 · 后端服务

校园话题社区「同窗」的 API 服务：Express 4 + Prisma 6 + MySQL 8 + Redis + Socket.IO，TypeScript 由 Node 24 原生类型擦除直接运行，**无构建步骤**。

## 技术要点

- **运行时**：Node ≥ 24（`node src/server.ts` 直接运行 TS；受类型擦除限制，代码中不使用 `enum` / `namespace`，以 `as const` 对象代替）
- **ORM**：Prisma 6（**锁定 6.x**；`migrate dev` 生成迁移，中文全文索引通过手写迁移 SQL 补充 `WITH PARSER ngram`，启动时 `ensureFulltextIndex()` 幂等兜底）
- **校验**：Zod（服务端对所有请求重复校验，正则与前端保持同源）
- **鉴权**：JWT 双令牌——access 2h（响应体返回）、refresh 14d（httpOnly Cookie + Redis 白名单，支持轮换与主动登出）
- **限流**：Redis ZSET 滑动窗口；按 IP（登录/注册/验证码）与账号（发帖/评论/点赞/收藏/举报/上传，区分新账号沙箱期与普通用户）
- **实时**：Socket.IO 与 HTTP 同端口，JWT 握手鉴权，按 `user:{id}` 房间推送通知
- **定时任务**：浏览计数冲刷（每分钟）、热门榜重算（每 10 分钟，HN 引力公式十进制 ZSET 前 100）

## 环境变量（backend/.env，参考 .env.example）

| 变量 | 说明 |
|---|---|
| `PORT` | 服务端口（默认 3100） |
| `DATABASE_URL` | MySQL 连接串（需先建库，utf8mb4） |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 各 ≥ 32 字符，启动时强校验 |
| `REDIS_URL` | Redis 连接串 |
| `SMTP_HOST/PORT/USER/PASS`、`MAIL_FROM` | QQ 邮箱 SMTP（验证码邮件） |
| `ALLOWED_EMAIL_DOMAINS` | 教育邮箱白名单后缀（逗号分隔，`.` 开头匹配任意子域） |
| `TEST_MODE` | `1` = 验证码只写 Redis 不实发（自动化测试用，防邮箱封禁）；`0` = 真实发信。生产必须为 `0` |
| `CORS_ORIGIN` | 允许的前端来源（逗号分隔） |

## 常用命令

```bash
npm install
npx prisma migrate dev   # 应用迁移（含 ngram 全文索引）
npm run seed             # 重建种子数据（清空业务数据后写入）
npm run dev              # 开发（--watch 热重启）
npm start                # 直接启动
npm run typecheck        # tsc --noEmit 类型检查
```

## 目录结构

```
src/
├── config/env.ts          # 环境变量集中读取与校验（含 TEST_MODE）
├── constants/             # 错误码、校验正则、状态枚举（as const）
├── types/                 # SafeUser 等共享类型、Express 类型扩展
├── middlewares/           # requireAuth/requireVerified/requireAdmin、限流、上传、错误处理
├── services/              # 业务逻辑层
│   ├── auth / email-code  #   注册登录、验证码
│   ├── post / comment     #   帖子（信息流/编辑历史/采纳）、两级评论
│   ├── interact / draft   #   点赞收藏、草稿
│   ├── search / hot       #   ngram 搜索、热门榜 ZSET
│   ├── sensitive          #   敏感词过滤（内存缓存 60s）
│   ├── report / admin     #   举报闭环、管理后台
│   ├── notification       #   通知落库 + Socket 推送
│   ├── follow / profile   #   关注、用户主页
│   └── course / poll      #   课程与结构化评分、投票
├── controllers/           # 请求解析（Zod）与响应封装
├── routes/index.ts        # 路由总表（统一响应包络 { code, message, data }）
├── sockets/               # Socket.IO 网关
├── jobs/                  # 定时任务
└── utils/                 # JWT、Redis、邮件、等级、浏览去重、审计、错误响应
```

## 接口约定

- 统一响应：`{ code, message, data }`；业务错误码分段（1xxxx 通用 / 2xxxx 账号 / 3xxxx 内容 / 4xxxx 互动 / 5xxxx 上传）
- HTTP 状态码仅用于 401（未登录）与 403（无权限），其余业务错误 HTTP 200 + 业务码
- 分页：信息流用游标（`cursor`），后台与搜索用页码（`page/pageSize`）

## 数据模型

见 `prisma/schema.prisma`：用户 / 邀请码 / 板块 / 标签与同义词 / 帖子与编辑历史 / 评论（两级自关联）/ 点赞 / 收藏夹 / 关注 / 浏览 / 通知 / 举报 / 草稿 / 课程与课程评分 / 审计日志 / 敏感词 / 公告 / 投票。

种子数据包含超级管理员（`guo` / `123456`，仅开发用）、7 个板块、12 个标签、3 门课程、8 位演示用户与 9 条演示帖子，`npm run seed` 可随时重建。
