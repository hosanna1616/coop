import { authorize } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import * as dailyReportRepo from "@/backend/repositories/daily-report-repository";
import { getUserById } from "@/backend/repositories/user-repository";
import * as activityLogService from "@/backend/services/activity-log-service";

export type SubmitDailyReportData = {
  reportDate: string; // ISO date YYYY-MM-DD
  content: string;
};

export async function submitDailyReport(
  data: SubmitDailyReportData
): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "submitDailyReport");

  let branchId = session.branchId;
  if (!branchId) {
    branchId = await dailyReportRepo.getUserTeamBranchId(session.id);
  }
  if (!branchId) return { ok: false, error: "You are not assigned to a branch." };

  const date = new Date(data.reportDate + "T00:00:00.000Z");
  const report = await dailyReportRepo.upsertDailyReport({
    userId: session.id,
    branchId,
    reportDate: date,
    content: data.content,
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "User", "DAILY_REPORT_SUBMIT", {
    entityType: "DailyReport",
    entityId: report.id,
    branchId,
    metadata: { reportDate: data.reportDate },
  });

  return { ok: true };
}

export type DailyReportFilters = {
  branchId?: string | null;
  userId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
  offset?: number;
};

export async function getDailyReports(filters: DailyReportFilters = {}) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "getDailyReports");

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const where: Prisma.DailyReportWhereInput = {};

  if (session.role === "BRANCH_MANAGER" && session.branchId) {
    where.branchId = session.branchId;
    where.user = { role: "PLAYER" };
  } else if (filters.branchId) {
    where.branchId = filters.branchId;
  }

  if (filters.userId) where.userId = filters.userId;

  if (filters.fromDate || filters.toDate) {
    where.reportDate = {};
    if (filters.fromDate) {
      (where.reportDate as { gte?: Date }).gte = new Date(filters.fromDate + "T00:00:00.000Z");
    }
    if (filters.toDate) {
      (where.reportDate as { lte?: Date }).lte = new Date(filters.toDate + "T23:59:59.999Z");
    }
  }

  const [reports, total] = await Promise.all([
    dailyReportRepo.findDailyReports({ where, limit, offset }),
    dailyReportRepo.countDailyReports(where),
  ]);

  return { reports, total };
}

