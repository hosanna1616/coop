"use server";

import * as operationalSummaryService from "@/backend/services/operational-summary-service";

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

export async function getOperationalSummary(
  filters: OperationalSummaryFilters = {}
): Promise<OperationalSummaryResult> {
  return operationalSummaryService.getOperationalSummary(filters);
}

