// 草稿：每人一份，编辑器自动保存
import type { SafeUser } from '../types/safe-user.ts';
import { prisma } from '../utils/prisma.ts';

export async function getDraft(userId: number) {
  return prisma.draft.findUnique({ where: { userId } });
}

export async function saveDraft(
  userId: number,
  input: { boardId?: number | null; title?: string | null; content?: string | null },
) {
  const data = {
    boardId: input.boardId ?? null,
    title: input.title?.slice(0, 80) ?? null,
    content: input.content ?? null,
  };
  const draft = await prisma.draft.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return { updatedAt: draft.updatedAt };
}

export async function clearDraft(userId: number): Promise<void> {
  await prisma.draft.deleteMany({ where: { userId } });
}
