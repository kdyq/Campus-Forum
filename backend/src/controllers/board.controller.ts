import type { Request, Response } from 'express';
import { ok } from '../utils/http.ts';
import { prisma } from '../utils/prisma.ts';

export async function listBoardsHandler(_req: Request, res: Response) {
  const boards = await prisma.board.findMany({ orderBy: [{ order: 'asc' }, { id: 'asc' }] });
  const counts = await prisma.post.groupBy({
    by: ['boardId'],
    _count: { _all: true },
    where: { deletedAt: null, status: { not: 'REMOVED' } },
  });
  const countMap = new Map(counts.map((c) => [c.boardId, c._count._all]));
  ok(
    res,
    boards.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      order: b.order,
      postCount: countMap.get(b.id) ?? 0,
    })),
  );
}
