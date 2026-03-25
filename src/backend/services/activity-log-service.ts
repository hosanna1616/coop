import type { Prisma } from "@prisma/client";
import { authorize, type AuthSession } from "@/lib/auth";
import * as activityLogRepo from "@/backend/repositories/activity-log-repository";

export type ActivityLogFilters = {
  branchId?: string | null;
  userId?: string | null;
  fromDate?: string | null; // ISO date
  toDate?: string | null;
  action?: string | null;
  limit?: number;
  offset?: number;
};

export type ActivityLogEntry = {
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

export async function logActivity(
  session: AuthSession,
  actorName: string,
  action: string,
  options?: {
    entityType?: string;
    entityId?: string;
    branchId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await activityLogRepo.createActivityLog({
    userId: session.id,
    actorName,
    branchId: options?.branchId ?? session.branchId ?? null,
    action,
    entityType: options?.entityType ?? null,
    entityId: options?.entityId ?? null,
    metadata: options?.metadata,
  });
}

export async function getActivityLog(
  filters: ActivityLogFilters
): Promise<{ entries: ActivityLogEntry[]; total: number }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "getActivityLog");

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const where: Prisma.ActivityLogWhereInput = {};

  if (session.role === "BRANCH_MANAGER" && session.branchId) {
    where.branchId = session.branchId;

    const branchStaffIds = await activityLogRepo.getBranchStaffIds(session.branchId);
    where.userId = branchStaffIds.length > 0 ? { in: branchStaffIds } : "impossible-id";
  } else if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;

  if (filters.fromDate || filters.toDate) {
    where.createdAt = {};
    if (filters.fromDate) {
      (where.createdAt as { gte?: Date }).gte = new Date(filters.fromDate + "T00:00:00.000Z");
    }
    if (filters.toDate) {
      (where.createdAt as { lte?: Date }).lte = new Date(filters.toDate + "T23:59:59.999Z");
    }
  }

  const [entries, total] = await Promise.all([
    activityLogRepo.findActivityLogEntries({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    activityLogRepo.countActivityLogEntries(where),
  ]);

  return {
    entries,
    total,
  };
}

