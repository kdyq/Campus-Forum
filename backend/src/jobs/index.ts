// 定时任务：浏览计数冲刷、（第 3 步起）热门榜重算、草稿清理
import { flushViewBuffer } from '../utils/view.ts';
import { logger } from '../utils/logger.ts';

export function startJobs(): void {
  const viewFlusher = setInterval(
    () => {
      void flushViewBuffer();
    },
    60 * 1000,
  );
  viewFlusher.unref();
  logger.info('定时任务已启动：浏览计数冲刷（每分钟）');
}
