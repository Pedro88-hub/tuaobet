import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function logAdminAction(
  adminId: string,
  action: string,
  opts?: { targetUserId?: string | null; metadata?: Prisma.InputJsonValue }
): Promise<void> {
  await prisma.adminAuditLog.create({
    data: {
      adminId,
      action,
      targetUserId: opts?.targetUserId ?? undefined,
      metadata: opts?.metadata ?? undefined,
    },
  });
}
