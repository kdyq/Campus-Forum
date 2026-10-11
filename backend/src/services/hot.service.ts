// 热门榜：HN 引力公式变体，Redis ZSET 存 Top 100，定时任务每 10 分钟重算
// score = (点赞×3 + 评论×5 + 收藏×4 + 阅读×0.1) / (发布小时数 + 2)^1.5
import { redis } from '../utils/redis.ts';
import { prisma } from '../utils/prisma.ts';
import { safeUserSelect } from '../types/safe-user.ts';

const HOT_KEY = 'hot:posts';
const HOT_SIZE = 100;
const HOT_WINDOW_DAYS = 7;

export async function recalcHotRank(): Promise<void> {
  const since = new Date(Date.now() - HOT_WINDOW_DAYS * 24 * 3600 * 1000);
  const rows = await prisma.post.findMany({
    where: { deletedAt: null, status: { in: ['NORMAL', 'SOLVED', 'LOCKED'] }, createdAt: { gte: since } },
    select: { id: true, likeCount: true, commentCount: true, bookmarkCount: true, viewCount: true, createdAt: true },
  });
  const scored = rows
    .map((p) => ({
      id: p.id,
      score:
        (p.likeCount * 3 + p.commentCount * 5 + p.bookmarkCount * 4 + p.viewCount * 0.1) /
        Math.pow((Date.now() - p.createdAt.getTime()) / 3600000 + 2, 1.5),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, HOT_SIZE);

  const pipeline = redis.multi().del(HOT_KEY);
  for (const s of scored) {
    if (s.score > 0) pipeline.zadd(HOT_KEY, s.score, String(s.id));
  }
  await pipeline.exec();
}

async function readEntries(limit: number): Promise<{ id: number; score: number }[]> {
  const raw = await redis.zrevrange(HOT_KEY, 0, limit - 1, 'WITHSCORES');
  const entries: { id: number; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    entries.push({ id: Number(raw[i]), score: Number(raw[i + 1]) });
  }
  return entries;
}

async function mapEntries(entries: { id: number; score: number }[]) {
  if (entries.length === 0) return [];
  const posts = await prisma.post.findMany({
    where: { id: { in: entries.map((e) => e.id) }, deletedAt: null },
    include: { board: true, author: { select: safeUserSelect } },
  });
  const byId = new Map(posts.map((p) => [p.id, p]));
  return entries
    .map((e) => {
      const p = byId.get(e.id);
      if (!p) return null;
      return {
        id: p.id,
        title: p.title,
        boardName: p.board.name,
        boardSlug: p.board.slug,
        likeCount: p.likeCount,
        commentCount: p.commentCount,
        viewCount: p.viewCount,
        heat: Math.round(e.score * 10) / 10,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function getHotPosts(limit = 10) {
  let entries = await readEntries(limit);
  if (entries.length === 0) {
    await recalcHotRank();
    entries = await readEntries(limit);
  }
  let items = await mapEntries(entries);
  // ZSET 里存在已被删除/重建的旧帖 id 时，重算一次再读
  if (items.length === 0 && entries.length > 0) {
    await recalcHotRank();
    items = await mapEntries(await readEntries(limit));
  }
  return items;
}
