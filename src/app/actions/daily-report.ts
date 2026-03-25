"use server";

import {
  getDailyReports as getDailyReportsService,
  submitDailyReport as submitDailyReportService,
} from "@/backend/services/daily-report-service";

export type SubmitDailyReportData = {
  reportDate: string; // ISO date YYYY-MM-DD
  content: string;
};

export type DailyReportFilters = {
  branchId?: string | null;
  userId?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  limit?: number;
  offset?: number;
};

export async function submitDailyReport(
  data: SubmitDailyReportData
): Promise<{ ok: boolean; error?: string }> {
  return submitDailyReportService(data);
}

export async function getDailyReports(filters: DailyReportFilters = {}) {
  return getDailyReportsService(filters);
}
