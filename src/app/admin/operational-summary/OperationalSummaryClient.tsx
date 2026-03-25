"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getOperationalSummary,
  type OperationalSummaryResult,
  type OperationalSummaryFilters,
} from "@/app/actions/operational-summary";
import { getBranchesFromDb } from "@/app/actions/branches";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import {
  ClipboardList,
  Store,
  Users,
  FileText,
  Landmark,
  MapPin,
  Package,
  TrendingUp,
} from "lucide-react";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#eab308",
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OperationalSummaryClient({
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
  const [category, setCategory] = useState<string | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchSearch, setBranchSearch] = useState("");
  const [data, setData] = useState<OperationalSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      getBranchesFromDb()
        .then((list) => setBranches(list.map((b) => ({ id: b.id, name: b.name }))))
        .catch(() => setBranches([]));
    }
  }, [isAdmin]);

  const filters: OperationalSummaryFilters = useMemo(
    () => ({
      branchId,
      fromDate: fromDate || null,
      toDate: toDate || null,
      category,
    }),
    [branchId, fromDate, toDate, category]
  );

  useEffect(() => {
    setLoading(true);
    setError(null);
    getOperationalSummary(filters)
      .then(setData)
      .catch((e) => {
        setError(e?.message ?? "Failed to load summary");
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [filters.branchId, filters.fromDate, filters.toDate, filters.category]);

  const kpis = useMemo(() => {
    if (!data) return null;
    const totalMissions = data.missionsByBranch.reduce((s, r) => s + r.count, 0);
    const totalMerchants = data.merchantsByBranch.reduce((s, r) => s + r.count, 0);
    const totalLeads = data.leadsByBranch.reduce((s, r) => s + r.count, 0);
    const totalDailyReports = data.dailyReportCountsByBranch.reduce((s, r) => s + r.count, 0);
    const totalTasks = data.tasksByBranchAndStatus.reduce((s, r) => s + r.count, 0);
    const branchCount = data.branches.length;
    return { totalMissions, totalMerchants, totalLeads, totalDailyReports, totalTasks, branchCount };
  }, [data]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4">
      {showBackToBranches && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/operational-summary" className="hover:text-foreground">
            ← Back to branch list
          </Link>
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        {isAdmin && branches.length > 0 && (
          <div className="grid gap-1">
            <Label className="text-xs">Branch</Label>
            <Input
              type="search"
              placeholder="Search branch…"
              value={branchSearch}
              onChange={(e) => setBranchSearch(e.target.value)}
              className="w-48 font-mono text-sm"
            />
            <Select
              value={branchId ?? "all"}
              onValueChange={(v) => {
                if (v === "all") {
                  setBranchId(null);
                  router.push("/admin/operational-summary");
                } else {
                  setBranchId(v);
                  router.push(`/admin/operational-summary?branchId=${v}`);
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
        {data?.categories && data.categories.length > 0 && (
          <div className="grid gap-1">
            <Label className="text-xs">Category</Label>
            <Select
              value={category ?? "all"}
              onValueChange={(v) => setCategory(v === "all" ? null : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {data.categories.map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {branchId ? (
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/admin/reports?branchId=${encodeURIComponent(branchId)}`}
            className="hover:text-foreground"
          >
            Daily reports & activity log →
          </Link>
        </p>
      ) : isAdmin ? (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/reports" className="hover:text-foreground">
            Daily reports & activity log →
          </Link>
        </p>
      ) : null}

      {error && (
        <p className="font-mono text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <div className="min-h-[200px]">
          <PortalLoadingInline className="min-h-[200px]" />
        </div>
      ) : data ? (
        <div className="flex flex-col gap-6">
          {/* KPI cards */}
          {kpis && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <KPICard
                title="Missions"
                value={kpis.totalMissions}
                icon={<ClipboardList className="h-5 w-5" />}
                color="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
              />
              <KPICard
                title="Merchants"
                value={kpis.totalMerchants}
                icon={<Store className="h-5 w-5" />}
                color="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              />
              <KPICard
                title="Leads"
                value={kpis.totalLeads}
                icon={<Users className="h-5 w-5" />}
                color="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30"
              />
              <KPICard
                title="Daily reports"
                value={kpis.totalDailyReports}
                icon={<FileText className="h-5 w-5" />}
                color="bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30"
              />
              <KPICard
                title="Tasks"
                value={kpis.totalTasks}
                icon={<ClipboardList className="h-5 w-5" />}
                color="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30"
              />
              <KPICard
                title="Branches"
                value={kpis.branchCount}
                icon={<Landmark className="h-5 w-5" />}
                color="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30"
              />
            </div>
          )}

          {/* Summary donuts: Tasks by status, Lead conversion, Leads by category */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.tasksByBranchAndStatus.length > 0 && (
              <Card className="overflow-hidden border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="font-mono text-base">Tasks by status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aggregateByStatus(data.tasksByBranchAndStatus, "status")}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={65}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {aggregateByStatus(data.tasksByBranchAndStatus, "status").map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Tasks"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.leadsByBranch.length > 0 && (() => {
              const conversion = aggregateLeadConversion(data.leadsByBranch);
              if (conversion.every((d) => d.count === 0)) return null;
              return (
                <Card className="overflow-hidden border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="font-mono text-base">Lead conversion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={conversion}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={2}
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {conversion.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Leads"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {data.leadsByBranch.length > 0 && (() => {
              const byCategory = aggregateLeadsByCategory(data.leadsByBranch);
              if (byCategory.length === 0) return null;
              return (
                <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
                  <CardHeader>
                    <CardTitle className="font-mono text-base">Leads by category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={byCategory}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={65}
                            paddingAngle={2}
                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          >
                            {byCategory.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Leads"]} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Territory coverage summary */}
          {data.territoryHealthByBranch.length > 0 && (() => {
            const coverage = aggregateTerritoryCoverage(data.territoryHealthByBranch);
            if (!coverage.total) return null;
            return (
              <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <MapPin className="h-4 w-4 text-violet-500" />
                    Territory coverage summary
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Cells by status across all selected branches
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <div className="rounded-lg bg-violet-500/15 px-4 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Total cells</span>
                      <p className="text-xl font-bold tabular-nums text-violet-700 dark:text-violet-300">{coverage.total}</p>
                    </div>
                    <div className="rounded-lg bg-emerald-500/15 px-4 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Captured + Fortified</span>
                      <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{coverage.capturedPlusFortified}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/15 px-4 py-2">
                      <span className="text-xs font-medium text-muted-foreground">Scouted</span>
                      <p className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{coverage.scouted}</p>
                    </div>
                    <div className="rounded-lg bg-rose-500/15 px-4 py-2">
                      <span className="text-xs font-medium text-muted-foreground">At risk + Lost</span>
                      <p className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{coverage.atRiskPlusLost}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Missions by status – bar chart */}
          {data.missionsByBranch.length > 0 && (
            <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                  Missions by status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aggregateByStatus(data.missionsByBranch, "status")}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Missions" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Merchants by branch – bar chart */}
          {data.merchantsByBranch.length > 0 && (
            <Card className="overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <Store className="h-4 w-4 text-emerald-500" />
                  Merchants by branch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.merchantsByBranch.map((r) => ({ name: r.branchName, count: r.count }))}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 80, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={76} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Merchants" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Two-column: Other services usage (donut) + Territory health (donut) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {data.externalBankUsageByBranch.length > 0 && (
              <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <Landmark className="h-4 w-4 text-blue-500" />
                    Other services usage by area
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aggregateTopBanks(data.externalBankUsageByBranch, 8)}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {aggregateTopBanks(data.externalBankUsageByBranch, 8).map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Leads"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.territoryHealthByBranch.length > 0 && (
              <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-mono text-base">
                    <MapPin className="h-4 w-4 text-violet-500" />
                    Territory health
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={aggregateByStatus(data.territoryHealthByBranch, "status")}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        >
                          {aggregateByStatus(data.territoryHealthByBranch, "status").map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number | undefined) => [v ?? 0, "Cells"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Leads by category – bar chart */}
          {data.leadsByBranch.length > 0 && (
            <Card className="overflow-hidden border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <Users className="h-4 w-4 text-sky-500" />
                  Leads by category & status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={aggregateLeadsForChart(data.leadsByBranch)}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="NEW" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="New" stackId="a" />
                      <Bar dataKey="CONVERTED" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Converted" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deployment assets by branch – horizontal bar */}
          {data.deploymentAssetsByBranch.length > 0 && (
            <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <Package className="h-4 w-4 text-orange-500" />
                  Deployment assets by branch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.deploymentAssetsByBranch.slice(0, 12).map((r) => ({
                        name: `${r.branchName} · ${r.assetName}`,
                        count: r.count,
                      }))}
                      layout="vertical"
                      margin={{ top: 8, right: 8, left: 120, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={116} />
                      <Tooltip contentStyle={{ fontSize: 12 }} />
                      <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} name="Merchants" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Color-coded summary tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ColorCodedTableCard
              title="Missions by branch"
              rows={data.missionsByBranch}
              columns={["branchName", "status", "count"]}
              keys={(r) => `${r.branchId}:${r.status}`}
              countColumn="count"
            />
            <ColorCodedTableCard
              title="Daily report submission"
              rows={data.dailyReportCountsByBranch}
              columns={["branchName", "count"]}
              keys={(r) => r.branchId}
              countColumn="count"
            />
          </div>

          {/* Other services usage table (detailed) */}
          {data.externalBankUsageByBranch.length > 0 && (
            <ColorCodedTableCard
              title="Other services usage (detail)"
              rows={data.externalBankUsageByBranch}
              columns={["branchName", "externalBankName", "count"]}
              keys={(r) => `${r.branchId}:${r.externalBankId}`}
              countColumn="count"
            />
          )}

          {/* Tasks by branch and status – compact table */}
          {data.tasksByBranchAndStatus.length > 0 && (
            <ColorCodedTableCard
              title="Tasks by branch and status"
              rows={data.tasksByBranchAndStatus}
              columns={["branchName", "status", "count"]}
              keys={(r) => `${r.branchId}:${r.status}`}
              countColumn="count"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className={`overflow-hidden border ${color}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider opacity-80">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${color.split(" ")[0]}`}>{icon}</div>
      </CardContent>
    </Card>
  );
}

function aggregateByStatus(
  rows: { status: string; count: number }[],
  statusKey: "status"
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r[statusKey];
    map.set(key, (map.get(key) ?? 0) + r.count);
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}

function aggregateTopBanks(
  rows: { externalBankName: string; count: number }[],
  limit: number
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.externalBankName, (map.get(r.externalBankName) ?? 0) + r.count);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function aggregateLeadsForChart(
  rows: { category: string; status: string; count: number }[]
): { name: string; NEW: number; CONVERTED: number }[] {
  const map = new Map<string, { NEW: number; CONVERTED: number }>();
  for (const r of rows) {
    const key = r.category;
    const cur = map.get(key) ?? { NEW: 0, CONVERTED: 0 };
    if (r.status === "NEW") cur.NEW += r.count;
    else cur.CONVERTED += r.count;
    map.set(key, cur);
  }
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
}

function aggregateLeadConversion(
  rows: { status: string; count: number }[]
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.status, (map.get(r.status) ?? 0) + r.count);
  }
  return [
    { name: "New", count: map.get("NEW") ?? 0 },
    { name: "Converted", count: map.get("CONVERTED") ?? 0 },
  ].filter((d) => d.count > 0);
}

function aggregateLeadsByCategory(
  rows: { category: string; count: number }[]
): { name: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.category, (map.get(r.category) ?? 0) + r.count);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .filter((d) => d.count > 0)
    .sort((a, b) => b.count - a.count);
}

function aggregateTerritoryCoverage(
  rows: { status: string; count: number }[]
): { total: number; capturedPlusFortified: number; scouted: number; atRiskPlusLost: number } {
  let total = 0;
  let capturedPlusFortified = 0;
  let scouted = 0;
  let atRiskPlusLost = 0;
  for (const r of rows) {
    total += r.count;
    if (r.status === "CAPTURED" || r.status === "FORTIFIED") capturedPlusFortified += r.count;
    else if (r.status === "SCOUTED") scouted += r.count;
    else if (r.status === "AT_RISK" || r.status === "LOST") atRiskPlusLost += r.count;
  }
  return { total, capturedPlusFortified, scouted, atRiskPlusLost };
}

const headerLabels: Record<string, string> = {
  branchName: "Branch",
  status: "Status",
  count: "Count",
  category: "Category",
  externalBankName: "Other service",
  assetName: "Asset",
};

function colorForCount(count: number, max: number): string {
  if (max <= 0) return "bg-muted/50";
  const p = count / max;
  if (p >= 0.6) return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
  if (p >= 0.3) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
}

function ColorCodedTableCard<T extends Record<string, unknown>>({
  title,
  rows,
  columns,
  keys,
  countColumn,
}: {
  title: string;
  rows: T[];
  columns: (keyof T)[];
  keys: (r: T) => string;
  countColumn: keyof T;
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data in this range.</p>
        </CardContent>
      </Card>
    );
  }

  const countValues = rows.map((r) => Number(r[countColumn])).filter((n) => !isNaN(n));
  const maxCount = countValues.length > 0 ? Math.max(...countValues) : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{rows.length} rows</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col) => (
                  <th
                    key={String(col)}
                    className="p-2 text-left font-medium text-muted-foreground"
                  >
                    {headerLabels[String(col)] ?? String(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 15).map((r) => (
                <tr key={keys(r)} className="border-b border-border/50">
                  {columns.map((col) => {
                    const isCount = col === countColumn;
                    const count = isCount ? Number(r[col]) : 0;
                    const cellClass = isCount && !isNaN(count)
                      ? `font-semibold tabular-nums ${colorForCount(count, maxCount)}`
                      : "";
                    return (
                      <td key={String(col)} className={`p-2 ${cellClass}`}>
                        {String(r[col] ?? "—")}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 15 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing 15 of {rows.length} rows
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
