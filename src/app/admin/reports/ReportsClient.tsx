"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getActivityLog, type ActivityLogFilters } from "@/app/actions/activity-log";
import { getDailyReports } from "@/app/actions/daily-report";
import { getBranchesFromDb } from "@/app/actions/branches";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type ActivityEntry = {
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

type DailyReportRow = {
  id: string;
  reportDate: Date;
  content: string;
  user: { id: string; name: string };
  branch: { id: string; name: string };
};

export function ReportsClient({
  isAdmin,
  defaultBranchId,
  showBackToBranches,
}: {
  isAdmin: boolean;
  defaultBranchId: string | null;
  showBackToBranches?: boolean;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState<string | null>(defaultBranchId);
  const [fromDate, setFromDate] = useState(todayISO);
  const [toDate, setToDate] = useState(todayISO);
  const [actionFilter, setActionFilter] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [activityPage, setActivityPage] = useState(0);
  const [reportsPage, setReportsPage] = useState(0);
  const limit = 20;

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => b.name.toLowerCase().includes(q));
  }, [branches, branchSearch]);

  useEffect(() => {
    setBranchId(defaultBranchId);
  }, [defaultBranchId]);

  useEffect(() => {
    if (isAdmin) {
      getBranchesFromDb().then((list) =>
        setBranches(list.map((b) => ({ id: b.id, name: b.name })))
      ).catch(() => setBranches([]));
    }
  }, [isAdmin]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {showBackToBranches && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/reports" className="hover:text-foreground">← Back to branch list</Link>
        </p>
      )}
      <div className="flex flex-wrap items-end gap-4">
        {isAdmin && branches.length > 0 && (
          <div className="grid gap-1">
            <Label className="text-xs">Branch</Label>
            <Input
              type="search"
              placeholder="Search branch name…"
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-48 font-mono text-sm"
            />
            <Select
              value={branchId ?? "all"}
              onValueChange={(v) => {
                if (v === "all") {
                  setBranchId(null);
                  router.push("/admin/reports");
                } else {
                  setBranchId(v);
                  router.push(`/admin/reports?branchId=${v}`);
                }
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {filteredBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="grid gap-1">
          <Label className="text-xs">From date</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40 font-mono"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">To date</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40 font-mono"
          />
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Action</Label>
          <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="LOGIN">LOGIN</SelectItem>
              <SelectItem value="USER_CREATE">USER_CREATE</SelectItem>
              <SelectItem value="USER_UPDATE">USER_UPDATE</SelectItem>
              <SelectItem value="USER_UPDATE_ROLE">USER_UPDATE_ROLE</SelectItem>
              <SelectItem value="USER_RESET_PASSWORD">USER_RESET_PASSWORD</SelectItem>
              <SelectItem value="BRANCH_CREATE">BRANCH_CREATE</SelectItem>
              <SelectItem value="MISSION_CREATE">MISSION_CREATE</SelectItem>
              <SelectItem value="MISSION_GOAL_CREATE">MISSION_GOAL_CREATE</SelectItem>
              <SelectItem value="MISSION_TASK_ASSIGN">MISSION_TASK_ASSIGN</SelectItem>
              <SelectItem value="MISSION_TASK_UPDATE_STATUS">MISSION_TASK_UPDATE_STATUS</SelectItem>
              <SelectItem value="DAILY_REPORT_SUBMIT">DAILY_REPORT_SUBMIT</SelectItem>
              <SelectItem value="LEAD_SCOUT">LEAD_SCOUT</SelectItem>
              <SelectItem value="MERCHANT_INDUCT">MERCHANT_INDUCT</SelectItem>
              <SelectItem value="ZONE_STATUS_UPDATE">ZONE_STATUS_UPDATE</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DailyReportsSection
        branchId={branchId}
        fromDate={fromDate || null}
        toDate={toDate || null}
        page={reportsPage}
        onPageChange={setReportsPage}
        limit={limit}
      />

      <ActivityLogSection
        filters={{
          branchId,
          fromDate: fromDate || null,
          toDate: toDate || null,
          action: actionFilter || null,
          limit,
          offset: activityPage * limit,
        }}
        page={activityPage}
        onPageChange={setActivityPage}
      />
    </div>
  );
}

function ActivityLogSection({
  filters,
  page,
  onPageChange,
}: {
  filters: ActivityLogFilters;
  page: number;
  onPageChange: (n: number) => void;
}) {
  const [data, setData] = useState<{ entries: ActivityEntry[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getActivityLog(filters)
      .then(setData)
      .catch(() => setData({ entries: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [filters.branchId, filters.fromDate, filters.toDate, filters.action, filters.offset]);

  const totalPages = data ? Math.ceil(data.total / (filters.limit ?? 50)) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Activity log</CardTitle>
        {data && (
          <span className="font-mono text-xs text-muted-foreground">
            {data.total} total
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="min-h-[120px]">
            <PortalLoadingInline className="min-h-[120px]" />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity in this range.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2 text-left text-muted-foreground">Time</th>
                    <th className="p-2 text-left text-muted-foreground">Actor</th>
                    <th className="p-2 text-left text-muted-foreground">Action</th>
                    <th className="p-2 text-left text-muted-foreground">Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((e) => (
                    <tr key={e.id} className="border-b border-border/50">
                      <td className="p-2 text-muted-foreground">
                        {new Date(e.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2">{e.actorName}</td>
                      <td className="p-2">{e.action}</td>
                      <td className="p-2">
                        {e.entityType && e.entityId
                          ? `${e.entityType} ${e.entityId.slice(0, 8)}…`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function DailyReportsSection({
  branchId,
  fromDate,
  toDate,
  page,
  onPageChange,
  limit,
}: {
  branchId: string | null;
  fromDate: string | null;
  toDate: string | null;
  page: number;
  onPageChange: (n: number) => void;
  limit: number;
}) {
  const [data, setData] = useState<{ reports: DailyReportRow[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getDailyReports({
      branchId,
      fromDate,
      toDate,
      limit,
      offset: page * limit,
    })
      .then((r) => setData({ reports: r.reports, total: r.total }))
      .catch(() => setData({ reports: [], total: 0 }))
      .finally(() => setLoading(false));
  }, [branchId, fromDate, toDate, page, limit]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Daily reports</CardTitle>
        {data && (
          <span className="font-mono text-xs text-muted-foreground">
            {data.total} total
          </span>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="min-h-[120px]">
            <PortalLoadingInline className="min-h-[120px]" />
          </div>
        ) : !data || data.reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily reports in this range.</p>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {data.reports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-border bg-card/50 p-3 font-mono text-sm"
                >
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {r.user.name} · {r.branch.name}
                    </span>
                    <span>{new Date(r.reportDate).toLocaleDateString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">{r.content}</p>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
