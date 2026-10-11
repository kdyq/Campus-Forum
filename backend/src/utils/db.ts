// 数据库层面的补充保障：Prisma 的 schema 无法描述 ngram 解析器，
// 中文全文索引在迁移与启动时双重保证存在（幂等）。
import { prisma } from './prisma.ts';
import { logger } from './logger.ts';

export async function ensureFulltextIndex(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ cnt: bigint | number }>>`
    SELECT COUNT(*) AS cnt FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'Post' AND index_name = 'ft_posts'`;
  if (Number(rows[0]?.cnt ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      'ALTER TABLE `posts` ADD FULLTEXT INDEX `ft_posts` (`title`, `content`) WITH PARSER `ngram`',
    );
    logger.info('已创建全文索引 ft_posts (ngram)');
  }
}
