import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActivityLogCreateParams = {
  userId: string;
  actorName: string;
  branchId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivityLogRawRow = {
  id: string;
  userId: string;
  actorName: string;
  branchId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  createdAt: Date;
};

export async function createActivityLog(params: ActivityLogCreateParams): Promise<void> {
  await prisma.activityLog.create({
    data: {
      userId: params.userId,
      actorName: params.actorName,
      branchId: params.branchId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? (params.metadata as object) : undefined,
    },
  });
}

export async function getBranchStaffIds(branchId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: "PLAYER",
      OR: [{ branchId }, { team: { branchId } }],
    },
    select: { id: true },
  });
  return rows.map((u) => u.id);
}

export async function findActivityLogEntries(params: {
  where: Prisma.ActivityLogWhereInput;
  orderBy: Prisma.ActivityLogOrderByWithRelationInput;
  take: number;
  skip: number;
}): Promise<ActivityLogRawRow[]> {
  const entries = await prisma.activityLog.findMany({
    where: params.where,
    orderBy: params.orderBy,
    take: params.take,
    skip: params.skip,
  });

  return entries.map((e) => ({
    id: e.id,
    userId: e.userId,
    actorName: e.actorName,
    branchId: e.branchId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    metadata: e.metadata,
    createdAt: e.createdAt,
  }));
}

export async function countActivityLogEntries(where: Prisma.ActivityLogWhereInput): Promise<number> {
  return prisma.activityLog.count({ where });
}

