// 定时任务：浏览计数冲刷（1 分钟）、热门榜重算（10 分钟）、草稿清理（每日）
import { flushViewBuffer } from '../utils/view.ts';
import { recalcHotRank } from '../services/hot.service.ts';
import { logger } from '../utils/logger.ts';

export function startJobs(): void {
  const viewFlusher = setInterval(
    () => {
      void flushViewBuffer();
    },
    60 * 1000,
  );
  viewFlusher.unref();

  const hotRecalcer = setInterval(
    () => {
      void recalcHotRank().catch((err) => logger.warn('热榜重算失败:', err));
    },
    10 * 60 * 1000,
  );
  hotRecalcer.unref();
  // 启动时先算一次，保证热榜立即可用
  void recalcHotRank().catch((err) => logger.warn('热榜首次重算失败:', err));

  logger.info('定时任务已启动：浏览计数冲刷（每分钟）、热门榜重算（每 10 分钟）');
}
