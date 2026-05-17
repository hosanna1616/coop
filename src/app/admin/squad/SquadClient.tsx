"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSquadDashboard } from "@/app/actions/field-operations";
import type { SquadDashboardResult } from "@/backend/services/field-operations-service";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

export function SquadClient({ branchId }: { branchId: string | null }) {
  const [data, setData] = useState<SquadDashboardResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getSquadDashboard(branchId);
      setData(d);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PortalLoadingInline className="min-h-[200px] w-full p-4" />;
  if (!data) {
    return (
      <p className="p-4 font-mono text-sm text-muted-foreground">
        Select a branch or assign yourself to a branch to view the squad dashboard.
      </p>
    );
  }

  const plan = data.operatingPlan;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-mono text-lg font-bold">{data.branchName}</h2>
          <p className="font-mono text-xs text-muted-foreground">Squad operations</p>
        </div>
        <Link
          href="/admin/operations"
          className="font-mono text-xs text-primary underline-offset-2 hover:underline"
        >
          Manage plans & work orders →
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{data.escalations.overdueWorkOrders}</p>
            <p className="font-mono text-xs text-muted-foreground">Overdue work orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{data.escalations.staleLeads}</p>
            <p className="font-mono text-xs text-muted-foreground">Scouts past induction SLA</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="font-mono text-2xl font-bold">{data.escalations.pendingTaskApprovals}</p>
            <p className="font-mono text-xs text-muted-foreground">Tasks awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {plan && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Weekly plan progress</CardTitle>
            <p className="font-mono text-xs text-muted-foreground">Week of {plan.weekStart}</p>
          </CardHeader>
          <CardContent className="font-mono text-xs text-muted-foreground space-y-1">
            <p>
              Scouts: {plan.branchMetrics.scouts}
              {plan.targetScouts > 0 ? ` / ${plan.targetScouts}` : ""}
            </p>
            <p>
              Inductions: {plan.branchMetrics.inductions}
              {plan.targetInductions > 0 ? ` / ${plan.targetInductions}` : ""}
            </p>
            <p>
              Deployments: {plan.branchMetrics.deployments}
              {plan.targetDeployments > 0 ? ` / ${plan.targetDeployments}` : ""}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Field officers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Officer</th>
                <th className="pb-2 pr-4">Scouts</th>
                <th className="pb-2 pr-4">Induct</th>
                <th className="pb-2 pr-4">Deploy</th>
                <th className="pb-2 pr-4">Report today</th>
                <th className="pb-2 pr-4">Open WO</th>
                <th className="pb-2">Overdue</th>
              </tr>
            </thead>
            <tbody>
              {data.members.map((m) => (
                <tr key={m.userId} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-medium text-foreground">{m.name}</td>
                  <td className="py-2 pr-4">{m.weekMetrics.scouts}</td>
                  <td className="py-2 pr-4">{m.weekMetrics.inductions}</td>
                  <td className="py-2 pr-4">{m.weekMetrics.deployments}</td>
                  <td className="py-2 pr-4">{m.reportFiledToday ? "Yes" : "No"}</td>
                  <td className="py-2 pr-4">{m.openWorkOrders}</td>
                  <td className="py-2">{m.overdueWorkOrders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.workOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Open work orders</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 font-mono text-xs">
              {data.workOrders.map((wo) => (
                <li key={wo.id} className="flex justify-between gap-2 border-b border-border/50 pb-2">
                  <span className={wo.overdue ? "text-destructive" : "text-foreground"}>
                    {wo.title} · {wo.assigneeName}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(wo.dueAt).toLocaleDateString()}
                    {wo.overdue ? " · overdue" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
