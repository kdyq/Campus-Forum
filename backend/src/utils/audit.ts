// 审计日志：管理操作留痕
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.ts';

export async function logAudit(
  actorId: number | null,
  action: string,
  targetType: string | null,
  targetId: number | null,
  meta?: Prisma.InputJsonValue,
  ip?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({ data: { actorId, action, targetType, targetId, meta, ip: ip ?? null } });
  } catch {
    // 日志失败不影响主流程
  }
}
