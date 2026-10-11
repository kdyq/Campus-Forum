// 敏感词过滤：词库内存缓存（60s），BLOCK 直接拦截、REVIEW 转人工审核
import { prisma } from '../utils/prisma.ts';
import { logger } from '../utils/logger.ts';

export type SensitiveResult = 'ok' | 'blocked' | 'review';

let cache: { words: { word: string; level: string }[]; loadedAt: number } | null = null;
const CACHE_TTL = 60 * 1000;

export function invalidateSensitiveCache(): void {
  cache = null;
}

async function loadWords(): Promise<{ word: string; level: string }[]> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL) return cache.words;
  const words = await prisma.sensitiveWord.findMany({ select: { word: true, level: true } });
  cache = { words, loadedAt: Date.now() };
  return words;
}

export async function checkSensitive(...texts: (string | null | undefined)[]): Promise<SensitiveResult> {
  const words = await loadWords();
  if (words.length === 0) return 'ok';
  const haystack = texts.filter((t): t is string => Boolean(t)).join('\n').toLowerCase();
  if (!haystack) return 'ok';
  let result: SensitiveResult = 'ok';
  for (const { word, level } of words) {
    const w = word.toLowerCase();
    if (!w) continue;
    if (haystack.includes(w)) {
      if (level === 'BLOCK') return 'blocked';
      if (level === 'REVIEW') result = 'review';
    }
  }
  return result;
}

export async function listWords() {
  return prisma.sensitiveWord.findMany({ orderBy: [{ level: 'asc' }, { id: 'desc' }] });
}

export async function addWord(word: string, level: 'BLOCK' | 'REVIEW') {
  const existing = await prisma.sensitiveWord.findUnique({ where: { word } });
  if (existing) {
    const updated = await prisma.sensitiveWord.update({ where: { word }, data: { level } });
    invalidateSensitiveCache();
    return updated;
  }
  const created = await prisma.sensitiveWord.create({ data: { word: word.slice(0, 50), level } });
  invalidateSensitiveCache();
  return created;
}

export async function removeWord(id: number) {
  await prisma.sensitiveWord.delete({ where: { id } }).catch(() => {
    logger.warn('敏感词不存在或已删除', id);
  });
  invalidateSensitiveCache();
  return { deleted: true };
}
