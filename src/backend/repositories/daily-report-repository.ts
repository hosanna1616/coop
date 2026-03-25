import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type DailyReportRow = {
  id: string;
  reportDate: Date;
  content: string;
  user: { id: string; name: string };
  branch: { id: string; name: string };
};

export async function getUserTeamBranchId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { team: { select: { branchId: true } } },
  });
  return user?.team?.branchId ?? null;
}

export async function upsertDailyReport(params: {
  userId: string;
  branchId: string;
  reportDate: Date;
  content: string;
}): Promise<{ id: string }> {
  const report = await prisma.dailyReport.upsert({
    where: {
      userId_reportDate: { userId: params.userId, reportDate: params.reportDate },
    },
    create: {
      userId: params.userId,
      branchId: params.branchId,
      reportDate: params.reportDate,
      content: params.content,
    },
    update: { content: params.content },
    select: { id: true },
  });
  return { id: report.id };
}

export async function findDailyReports(params: {
  where: Prisma.DailyReportWhereInput;
  limit: number;
  offset: number;
}): Promise<DailyReportRow[]> {
  const reports = await prisma.dailyReport.findMany({
    where: params.where,
    orderBy: { reportDate: "desc" },
    take: params.limit,
    skip: params.offset,
    include: {
      user: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  return reports.map((r) => ({
    id: r.id,
    reportDate: r.reportDate,
    content: r.content,
    user: { id: r.user.id, name: r.user.name },
    branch: { id: r.branch.id, name: r.branch.name },
  }));
}

export async function countDailyReports(where: Prisma.DailyReportWhereInput): Promise<number> {
  return prisma.dailyReport.count({ where });
}

