// 投票：发帖时创建，详情页展示与投票（匿名聚合，不暴露谁投了什么）
import { Prisma } from '@prisma/client';
import { AppError, CODES } from '../constants/codes.ts';
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';

export interface PollOptionInput {
  id: number;
  text: string;
}

interface PollRow {
  id: number;
  postId: number;
  question: string;
  options: unknown;
  multiple: boolean;
  closesAt: Date | null;
  createdAt: Date;
}

function parseOptions(raw: unknown): PollOptionInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => (typeof o === 'object' && o !== null ? { id: Number((o as { id: unknown }).id), text: String((o as { text: unknown }).text ?? '') } : null))
    .filter((o): o is PollOptionInput => o !== null && o.text.length > 0);
}

export async function createPoll(author: SafeUser, postId: number, input: { question: string; options: string[]; multiple: boolean; closesInDays?: number }) {
  const post = await prisma.post.findFirst({ where: { id: postId, deletedAt: null, authorId: author.id } });
  if (!post) throw new AppError(CODES.NOT_FOUND, '帖子不存在或无权操作', 404);
  const existing = await prisma.poll.findUnique({ where: { postId } });
  if (existing) throw new AppError(CODES.PARAM, '该帖子已有关联投票');
  const texts = input.options.map((t) => t.trim()).filter(Boolean);
  if (texts.length < 2 || texts.length > 6) throw new AppError(CODES.PARAM, '投票选项需 2 到 6 个');
  const options: PollOptionInput[] = texts.map((text, i) => ({ id: i + 1, text }));
  return prisma.poll.create({
    data: {
      postId,
      question: input.question.trim().slice(0, 120),
      options: options as unknown as Prisma.InputJsonValue,
      multiple: input.multiple,
      closesAt: input.closesInDays ? new Date(Date.now() + input.closesInDays * 86400 * 1000) : null,
    },
  });
}

export async function getPollForPost(postId: number, viewer: SafeUser | null | undefined) {
  const poll = (await prisma.poll.findUnique({ where: { postId } })) as PollRow | null;
  if (!poll) return null;
  const options = parseOptions(poll.options);
  const votes = await prisma.pollVote.findMany({ where: { pollId: poll.id }, select: { userId: true, choices: true } });
  const counts = new Map<number, number>();
  for (const v of votes) {
    const choices = Array.isArray(v.choices) ? (v.choices as unknown[]).map(Number) : [];
    for (const c of choices) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const totalVotes = votes.length;
  const myChoices = viewer ? (votes.find((v) => v.userId === viewer.id)?.choices as number[] | undefined) ?? [] : [];
  return {
    id: poll.id,
    question: poll.question,
    multiple: poll.multiple,
    closesAt: poll.closesAt,
    closed: poll.closesAt ? poll.closesAt < new Date() : false,
    options: options.map((o) => ({
      ...o,
      count: counts.get(o.id) ?? 0,
      percent: totalVotes > 0 ? Math.round(((counts.get(o.id) ?? 0) / totalVotes) * 100) : 0,
    })),
    totalVotes,
    myChoices,
  };
}

export async function votePoll(voter: SafeUser, pollId: number, choices: number[]) {
  const poll = (await prisma.poll.findUnique({ where: { id: pollId } })) as PollRow | null;
  if (!poll) throw new AppError(CODES.NOT_FOUND, '投票不存在', 404);
  if (poll.closesAt && poll.closesAt < new Date()) throw new AppError(CODES.PARAM, '投票已截止');
  const options = parseOptions(poll.options);
  const validIds = new Set(options.map((o) => o.id));
  const picked = [...new Set(choices.map(Number))].filter((c) => validIds.has(c));
  if (picked.length === 0) throw new AppError(CODES.PARAM, '请至少选择一个选项');
  if (!poll.multiple && picked.length > 1) throw new AppError(CODES.PARAM, '该投票为单选');
  await prisma.pollVote.upsert({
    where: { pollId_userId: { pollId, userId: voter.id } },
    update: { choices: picked },
    create: { pollId, userId: voter.id, choices: picked },
  });
  return getPollForPost(poll.postId, voter);
}
