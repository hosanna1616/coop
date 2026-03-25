import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export type OperationalSummaryFilters = {
  branchId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  category?: string | null;
};

export type MissionsByBranchRow = {
  branchId: string;
  branchName: string;
  status: string;
  count: number;
};

export type TasksByBranchStatusRow = {
  branchId: string;
  branchName: string;
  status: string;
  count: number;
};

export type MerchantsByBranchRow = {
  branchId: string;
  branchName: string;
  count: number;
};

export type LeadsByBranchRow = {
  branchId: string;
  branchName: string;
  category: string;
  status: string;
  count: number;
};

export type ExternalBankUsageRow = {
  branchId: string;
  branchName: string;
  externalBankId: string;
  externalBankName: string;
  count: number;
};

export type TerritoryHealthRow = {
  branchId: string;
  branchName: string;
  status: string;
  count: number;
};

export type DeploymentAssetsByBranchRow = {
  branchId: string;
  branchName: string;
  assetId: string;
  assetName: string;
  count: number;
};

export type DailyReportCountRow = {
  branchId: string;
  branchName: string;
  count: number;
};

export type ActivityCountRow = {
  action: string;
  count: number;
};

export type ActivityCountByBranchRow = {
  branchId: string;
  branchName: string;
  action: string;
  count: number;
};

export type OperationalSummaryResult = {
  branches: { id: string; name: string }[];
  categories: { name: string; displayName: string }[];
  missionsByBranch: MissionsByBranchRow[];
  tasksByBranchAndStatus: TasksByBranchStatusRow[];
  merchantsByBranch: MerchantsByBranchRow[];
  leadsByBranch: LeadsByBranchRow[];
  externalBankUsageByBranch: ExternalBankUsageRow[];
  territoryHealthByBranch: TerritoryHealthRow[];
  deploymentAssetsByBranch: DeploymentAssetsByBranchRow[];
  dailyReportCountsByBranch: DailyReportCountRow[];
  activityCountsByAction: ActivityCountRow[];
  activityCountsByBranchAndAction: ActivityCountByBranchRow[];
};

function parseDate(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? undefined : d;
}

export async function getOperationalSummary(
  filters: OperationalSummaryFilters = {}
): Promise<OperationalSummaryResult> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "getOperationalSummary");

  let branchIdFilter: string | null = filters.branchId ?? null;
  if (session.role === "BRANCH_MANAGER") {
    if (!session.branchId) {
      return emptySummary();
    }
    branchIdFilter = session.branchId;
  }

  const fromDate = parseDate(filters.fromDate);
  const toDate = parseDate(filters.toDate);
  const categoryFilter = filters.category?.trim() || null;

  const branchWhere: Prisma.BranchWhereInput = branchIdFilter ? { id: branchIdFilter } : {};

  const [
    branches,
    categories,
    missions,
    tasks,
    merchants,
    leads,
    leadsForBanks,
    territoryCells,
    deploymentRows,
    dailyReports,
    activityByAction,
    activityByBranch,
  ] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.scoutCategory.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { name: true, displayName: true },
    }),
    getMissionsByBranch(branchIdFilter, fromDate, toDate),
    getTasksByBranchAndStatus(branchIdFilter, fromDate, toDate),
    getMerchantsByBranch(branchIdFilter, fromDate, toDate, categoryFilter),
    getLeadsByBranch(branchIdFilter, fromDate, toDate, categoryFilter),
    getLeadsForExternalBankUsage(branchIdFilter),
    getTerritoryHealthByBranch(branchIdFilter),
    getDeploymentAssetsByBranch(branchIdFilter),
    getDailyReportCountsByBranch(branchIdFilter, fromDate, toDate),
    getActivityCountsByAction(branchIdFilter, fromDate, toDate),
    getActivityCountsByBranchAndAction(branchIdFilter, fromDate, toDate),
  ]);

  const branchMap = new Map(branches.map((b) => [b.id, b.name]));
  const externalBankUsage = aggregateExternalBankUsage(leadsForBanks, branchMap);
  const bankNames = await getExternalBankNames();

  return {
    branches,
    categories: categories.map((c) => ({ name: c.name, displayName: c.displayName })),
    missionsByBranch: missions,
    tasksByBranchAndStatus: tasks,
    merchantsByBranch: merchants,
    leadsByBranch: leads,
    externalBankUsageByBranch: externalBankUsage.map((r) => ({
      ...r,
      externalBankName: bankNames.get(r.externalBankId) ?? r.externalBankId,
    })),
    territoryHealthByBranch: territoryCells,
    deploymentAssetsByBranch: deploymentRows,
    dailyReportCountsByBranch: dailyReports,
    activityCountsByAction: activityByAction,
    activityCountsByBranchAndAction: activityByBranch,
  };
}

function emptySummary(): OperationalSummaryResult {
  return {
    branches: [],
    categories: [],
    missionsByBranch: [],
    tasksByBranchAndStatus: [],
    merchantsByBranch: [],
    leadsByBranch: [],
    externalBankUsageByBranch: [],
    territoryHealthByBranch: [],
    deploymentAssetsByBranch: [],
    dailyReportCountsByBranch: [],
    activityCountsByAction: [],
    activityCountsByBranchAndAction: [],
  };
}

const missionDateWhere = (from?: Date, to?: Date): Prisma.MissionWhereInput => {
  if (!from && !to) return {};
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) createdAt.gte = from;
  if (to) createdAt.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  return { createdAt };
};

async function getMissionsByBranch(
  branchId: string | null,
  from?: Date,
  to?: Date
): Promise<MissionsByBranchRow[]> {
  const branchWhere: Prisma.MissionWhereInput["branchId"] = branchId ? branchId : undefined;
  const dateWhere = missionDateWhere(from, to);
  const rows = await prisma.mission.groupBy({
    by: ["branchId", "status"],
    where: {
      ...(branchWhere && { branchId: branchWhere }),
      ...dateWhere,
      branchId: { not: null },
    },
    _count: { id: true },
  });

  const branchIds = [...new Set(rows.map((r) => r.branchId).filter(Boolean))] as string[];
  const branchMap = await getBranchNameMap(branchIds);

  return rows.map((r) => ({
    branchId: r.branchId!,
    branchName: branchMap.get(r.branchId!) ?? r.branchId!,
    status: r.status,
    count: r._count.id,
  }));
}

async function getTasksByBranchAndStatus(
  branchId: string | null,
  from?: Date,
  to?: Date
): Promise<TasksByBranchStatusRow[]> {
  const missionWhere: Prisma.MissionWhereInput = {
    ...(branchId && { branchId }),
    branchId: { not: null },
  };
  if (from || to) {
    missionWhere.createdAt = {};
    if (from) missionWhere.createdAt.gte = from;
    if (to) missionWhere.createdAt.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }

  const tasks = await prisma.missionTask.findMany({
    where: { mission: missionWhere },
    select: {
      status: true,
      mission: { select: { branchId: true } },
    },
  });

  const branchIds = [...new Set(tasks.map((t) => t.mission.branchId).filter(Boolean))] as string[];
  const branchMap = await getBranchNameMap(branchIds);

  const map = new Map<string, number>();
  for (const t of tasks) {
    const bid = t.mission.branchId;
    if (!bid) continue;
    const key = `${bid}:${t.status}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  return Array.from(map.entries()).map(([key, count]) => {
    const [branchIdKey, status] = key.split(":");
    return {
      branchId: branchIdKey,
      branchName: branchMap.get(branchIdKey) ?? branchIdKey,
      status,
      count,
    };
  });
}

async function getMerchantsByBranch(
  branchId: string | null,
  from?: Date,
  to?: Date,
  category?: string | null
): Promise<MerchantsByBranchRow[]> {
  const where: Prisma.MerchantWhereInput = {
    inductedBy: {
      ...(branchId && { branchId: branchId }),
    },
  };
  if (!branchId) {
    where.inductedBy = { branchId: { not: null } };
  }
  if (from || to) {
    where.onboardingDate = {};
    if (from) where.onboardingDate.gte = from;
    if (to) where.onboardingDate.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }
  if (category) {
    where.lead = { category };
  }

  const rows = await prisma.merchant.groupBy({
    by: ["inductedById"],
    where,
    _count: { id: true },
  });

  const userIds = rows.map((r) => r.inductedById);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, branchId: true },
  });
  const userToBranch = new Map<string, string>();
  for (const u of users) {
    if (u.branchId) userToBranch.set(u.id, u.branchId);
  }
  const branchIds = [...new Set(userToBranch.values())];
  const branchMap = await getBranchNameMap(branchIds);

  const byBranch = new Map<string, number>();
  for (const r of rows) {
    const bid = userToBranch.get(r.inductedById);
    if (!bid) continue;
    byBranch.set(bid, (byBranch.get(bid) ?? 0) + r._count.id);
  }

  return Array.from(byBranch.entries()).map(([branchIdKey, count]) => ({
    branchId: branchIdKey,
    branchName: branchMap.get(branchIdKey) ?? branchIdKey,
    count,
  }));
}

async function getLeadsByBranch(
  branchId: string | null,
  from?: Date,
  to?: Date,
  category?: string | null
): Promise<LeadsByBranchRow[]> {
  const where: Prisma.LeadWhereInput = branchId
    ? {
        OR: [{ zone: { branchId } }, { scoutedBy: { branchId } }],
      }
    : {
        OR: [
          { zone: { branchId: { not: null } } },
          { scoutedBy: { branchId: { not: null } } },
        ],
      };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }
  if (category) where.category = category;

  const leads = await prisma.lead.findMany({
    where,
    select: {
      category: true,
      status: true,
      zone: { select: { branchId: true } },
      scoutedBy: { select: { branchId: true } },
    },
  });

  const branchIds = new Set<string>();
  const keyCount = new Map<string, number>();
  for (const l of leads) {
    const bid = l.zone?.branchId ?? l.scoutedBy?.branchId ?? null;
    if (!bid) continue;
    branchIds.add(bid);
    const key = `${bid}:${l.category}:${l.status}`;
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
  }
  const branchMap = await getBranchNameMap([...branchIds]);

  return Array.from(keyCount.entries()).map(([key, count]) => {
    const parts = key.split(":");
    const branchIdKey = parts[0];
    const categoryVal = parts[1];
    const status = parts[2];
    return {
      branchId: branchIdKey,
      branchName: branchMap.get(branchIdKey) ?? branchIdKey,
      category: categoryVal,
      status,
      count,
    };
  });
}

type LeadBankRow = {
  zoneBranchId: string | null;
  scoutedByBranchId: string | null;
  externalBankIds: string[];
};

async function getLeadsForExternalBankUsage(branchId: string | null): Promise<LeadBankRow[]> {
  const where: Prisma.LeadWhereInput = branchId
    ? {
        OR: [{ zone: { branchId } }, { scoutedBy: { branchId } }],
      }
    : {
        OR: [
          { zone: { branchId: { not: null } } },
          { scoutedBy: { branchId: { not: null } } },
        ],
      };

  const leads = await prisma.lead.findMany({
    where,
    select: {
      externalBankIds: true,
      zone: { select: { branchId: true } },
      scoutedBy: { select: { branchId: true } },
    },
  });

  return leads.map((l) => ({
    zoneBranchId: l.zone?.branchId ?? null,
    scoutedByBranchId: l.scoutedBy?.branchId ?? null,
    externalBankIds: l.externalBankIds ?? [],
  }));
}

function aggregateExternalBankUsage(
  leads: LeadBankRow[],
  branchMap: Map<string, string>
): Omit<ExternalBankUsageRow, "externalBankName">[] {
  const countByKey = new Map<string, number>();
  for (const l of leads) {
    const branchId = l.zoneBranchId ?? l.scoutedByBranchId;
    if (!branchId) continue;
    for (const bankId of l.externalBankIds) {
      if (!bankId) continue;
      const key = `${branchId}:${bankId}`;
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
    }
  }
  return Array.from(countByKey.entries()).map(([key, count]) => {
    const [branchId, externalBankId] = key.split(":");
    return {
      branchId,
      branchName: branchMap.get(branchId) ?? branchId,
      externalBankId,
      count,
    };
  });
}

async function getExternalBankNames(): Promise<Map<string, string>> {
  const banks = await prisma.externalBank.findMany({
    select: { id: true, name: true },
  });
  return new Map(banks.map((b) => [b.id, b.name]));
}

async function getTerritoryHealthByBranch(branchId: string | null): Promise<TerritoryHealthRow[]> {
  const where: Prisma.TerritoryCellWhereInput = branchId ? { branchId } : {};
  const rows = await prisma.territoryCell.groupBy({
    by: ["branchId", "status"],
    where,
    _count: { id: true },
  });

  const branchIds = [...new Set(rows.map((r) => r.branchId))];
  const branchMap = await getBranchNameMap(branchIds);

  return rows.map((r) => ({
    branchId: r.branchId,
    branchName: branchMap.get(r.branchId) ?? r.branchId,
    status: r.status,
    count: r._count.id,
  }));
}

async function getDeploymentAssetsByBranch(
  branchId: string | null
): Promise<DeploymentAssetsByBranchRow[]> {
  const rows = await prisma.merchantDeploymentAsset.findMany({
    where: {
      merchant: {
        inductedBy: branchId ? { branchId } : { branchId: { not: null } },
      },
    },
    select: {
      deploymentAssetId: true,
      deploymentAsset: { select: { displayName: true } },
      merchant: { select: { inductedBy: { select: { branchId: true } } } },
    },
  });

  const keyCount = new Map<string, number>();
  const keyAssetName = new Map<string, string>();
  for (const r of rows) {
    const bid = r.merchant.inductedBy?.branchId;
    if (!bid) continue;
    if (branchId && bid !== branchId) continue;
    const key = `${bid}:${r.deploymentAssetId}`;
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1);
    keyAssetName.set(key, r.deploymentAsset.displayName);
  }

  const branchIds = [...new Set(Array.from(keyCount.keys()).map((k) => k.split(":")[0]))];
  const branchMap = await getBranchNameMap(branchIds);

  return Array.from(keyCount.entries()).map(([key, count]) => {
    const [branchIdKey, assetId] = key.split(":");
    return {
      branchId: branchIdKey,
      branchName: branchMap.get(branchIdKey) ?? branchIdKey,
      assetId,
      assetName: keyAssetName.get(key) ?? assetId,
      count,
    };
  });
}

async function getDailyReportCountsByBranch(
  branchId: string | null,
  from?: Date,
  to?: Date
): Promise<DailyReportCountRow[]> {
  const where: Prisma.DailyReportWhereInput = branchId ? { branchId } : {};
  if (from || to) {
    where.reportDate = {};
    if (from) where.reportDate.gte = from;
    if (to) where.reportDate.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }

  const rows = await prisma.dailyReport.groupBy({
    by: ["branchId"],
    where,
    _count: { id: true },
  });

  const branchMap = await getBranchNameMap(rows.map((r) => r.branchId));
  return rows.map((r) => ({
    branchId: r.branchId,
    branchName: branchMap.get(r.branchId) ?? r.branchId,
    count: r._count.id,
  }));
}

async function getActivityCountsByAction(
  branchId: string | null,
  from?: Date,
  to?: Date
): Promise<ActivityCountRow[]> {
  const where: Prisma.ActivityLogWhereInput = branchId
    ? { branchId }
    : { branchId: { not: null } };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }

  const rows = await prisma.activityLog.groupBy({
    by: ["action"],
    where,
    _count: { id: true },
  });

  return rows.map((r) => ({ action: r.action, count: r._count.id }));
}

async function getActivityCountsByBranchAndAction(
  branchId: string | null,
  from?: Date,
  to?: Date
): Promise<ActivityCountByBranchRow[]> {
  const where: Prisma.ActivityLogWhereInput = branchId
    ? { branchId }
    : { branchId: { not: null } };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = new Date(to.toISOString().slice(0, 10) + "T23:59:59.999Z");
  }

  const rows = await prisma.activityLog.groupBy({
    by: ["branchId", "action"],
    where: { ...where, branchId: { not: null } },
    _count: { id: true },
  });

  const branchIds = [...new Set(rows.map((r) => r.branchId!).filter(Boolean))];
  const branchMap = await getBranchNameMap(branchIds);

  return rows.map((r) => ({
    branchId: r.branchId!,
    branchName: branchMap.get(r.branchId!) ?? r.branchId!,
    action: r.action,
    count: r._count.id,
  }));
}

async function getBranchNameMap(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const branches = await prisma.branch.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  return new Map(branches.map((b) => [b.id, b.name]));
}

