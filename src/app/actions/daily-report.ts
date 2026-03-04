"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";
import type { Prisma } from "@prisma/client";

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
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { team: { select: { branchId: true } } },
    });
    branchId = user?.team?.branchId ?? null;
  }
  if (!branchId) return { ok: false, error: "You are not assigned to a branch." };

  const date = new Date(data.reportDate + "T00:00:00.000Z");
  const report = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: { userId: session.id, reportDate: date },
    },
    create: {
      userId: session.id,
      branchId,
      reportDate: date,
      content: data.content,
    },
    update: { content: data.content },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "DAILY_REPORT_SUBMIT", {
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
      (where.reportDate as { gte?: Date }).gte = new Date(
        filters.fromDate + "T00:00:00.000Z"
      );
    }
    if (filters.toDate) {
      (where.reportDate as { lte?: Date }).lte = new Date(
        filters.toDate + "T23:59:59.999Z"
      );
    }
  }

  const [reports, total] = await Promise.all([
    prisma.dailyReport.findMany({
      where,
      orderBy: { reportDate: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.dailyReport.count({ where }),
  ]);

  return { reports, total };
}
