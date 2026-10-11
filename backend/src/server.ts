import { createServer } from 'node:http';
import { env } from './config/env.ts';
import { createApp } from './app.ts';
import { logger } from './utils/logger.ts';
import { ensureRedis } from './utils/redis.ts';
import { ensureFulltextIndex } from './utils/db.ts';
import { startJobs } from './jobs/index.ts';
import { initSockets } from './sockets/index.ts';

const app = createApp();
const httpServer = createServer(app);
initSockets(httpServer);

const redisOk = await ensureRedis();
if (!redisOk) logger.warn('Redis 未连接，验证码与限流相关接口不可用');

try {
  await ensureFulltextIndex();
} catch (err) {
  logger.warn('全文索引检查失败:', err);
}

httpServer.listen(env.port, () => {
  logger.info(`同窗 API 已启动: http://localhost:${env.port} (${env.nodeEnv})，WebSocket 同端口`);
});

startJobs();
