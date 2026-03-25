"use server";

import type { AuthSession } from "@/lib/auth";
import { getActivityLog as getActivityLogService, logActivity as logActivityService } from "@/backend/services/activity-log-service";

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

/** Call from server actions after a mutation to record the activity. */
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
  try {
    await logActivityService(session, actorName, action, options);
  } catch (e) {
    console.error("[activity-log] logActivity failed:", e);
  }
}

export async function getActivityLog(
  filters: ActivityLogFilters
): Promise<{ entries: ActivityLogEntry[]; total: number }> {
  return getActivityLogService(filters);
}
