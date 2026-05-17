"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getMyQueue, updateWorkOrderStatus } from "@/app/actions/field-operations";
import type { MyQueueResult, QueueItem } from "@/backend/services/field-operations-service";
import { WORK_ORDER_OBJECTIVE_LABELS } from "@/lib/field-operations";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import { cn } from "@/lib/utils";

function ProgressBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {current}
          {target > 0 ? ` / ${target}` : ""}
          {target > 0 ? ` (${pct}%)` : ""}
        </span>
      </div>
      {target > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function QueueItemRow({
  item,
  onWorkOrderStatus,
}: {
  item: QueueItem;
  onWorkOrderStatus: (id: string, status: "IN_PROGRESS" | "COMPLETED") => void;
}) {
  if (item.kind === "daily_report") {
    return (
      <li className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
        <p className="font-mono text-sm text-foreground">{item.message}</p>
        <Button asChild size="sm" className="mt-2 font-mono">
          <Link href={item.href}>Open report</Link>
        </Button>
      </li>
    );
  }

  if (item.kind === "work_order") {
    return (
      <li
        className={cn(
          "rounded-md border p-3",
          item.overdue ? "border-destructive/50 bg-destructive/5" : "border-border bg-card"
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-sm font-semibold text-foreground">{item.title}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {WORK_ORDER_OBJECTIVE_LABELS[item.objective] ?? item.objective}
              {item.cellCode ? ` · ${item.cellCode}` : ""}
              {" · Due "}
              {new Date(item.dueAt).toLocaleDateString()}
              {item.overdue ? " · OVERDUE" : ""}
            </p>
          </div>
          <div className="flex gap-1">
            {item.status === "PENDING" && (
              <Button
                size="sm"
                variant="outline"
                className="font-mono text-xs"
                onClick={() => onWorkOrderStatus(item.id, "IN_PROGRESS")}
              >
                Start
              </Button>
            )}
            {item.status !== "COMPLETED" && (
              <Button
                size="sm"
                className="font-mono text-xs"
                onClick={() => onWorkOrderStatus(item.id, "COMPLETED")}
              >
                Complete
              </Button>
            )}
          </div>
        </div>
      </li>
    );
  }

  if (item.kind === "mission_task") {
    return (
      <li className="rounded-md border border-border bg-card p-3">
        <p className="font-mono text-sm font-semibold">{item.title}</p>
        <p className="font-mono text-xs text-muted-foreground">
          Mission: {item.missionName} · {item.status}
        </p>
        <Button asChild size="sm" variant="outline" className="mt-2 font-mono text-xs">
          <Link href={item.href}>Open task</Link>
        </Button>
      </li>
    );
  }

  if (item.kind === "sla_lead") {
    return (
      <li className="rounded-md border border-secondary/40 bg-secondary/5 p-3">
        <p className="font-mono text-sm font-semibold">{item.businessName}</p>
        <p className="font-mono text-xs text-muted-foreground">
          Scout follow-up SLA · {item.daysSinceScout} days since scout
        </p>
        <Button asChild size="sm" className="mt-2 font-mono text-xs">
          <Link href={item.href}>Continue induction</Link>
        </Button>
      </li>
    );
  }

  return (
    <li className="rounded-md border border-secondary/40 bg-secondary/5 p-3">
      <p className="font-mono text-sm font-semibold">{item.businessName}</p>
      <p className="font-mono text-xs text-muted-foreground">
        Deployment SLA · {item.daysSinceInduct} days since induction
      </p>
      <Button asChild size="sm" className="mt-2 font-mono text-xs">
        <Link href={item.href}>Open merchants</Link>
      </Button>
    </li>
  );
}

export function WorkQueueClient() {
  const router = useRouter();
  const [data, setData] = useState<MyQueueResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = await getMyQueue();
      setData(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onWorkOrderStatus = async (id: string, status: "IN_PROGRESS" | "COMPLETED") => {
    const res = await updateWorkOrderStatus(id, status);
    if (res.ok) {
      await load();
      router.refresh();
    }
  };

  if (loading) {
    return <PortalLoadingInline className="min-h-[240px] w-full" />;
  }

  if (error) {
    return (
      <p className="p-4 font-mono text-sm text-destructive">{error}</p>
    );
  }

  const plan = data?.operatingPlan;

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {data?.fieldBrief && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Branch operating brief</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground whitespace-pre-wrap">{data.fieldBrief}</p>
          </CardContent>
        </Card>
      )}

      {plan && (
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-sm">Weekly operating plan</CardTitle>
            <p className="font-mono text-xs text-muted-foreground">
              Week of {plan.weekStart}
              {plan.notes ? ` · ${plan.notes}` : ""}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar
              label="Branch scouts"
              current={plan.branchMetrics.scouts}
              target={plan.targetScouts}
            />
            <ProgressBar
              label="Branch inductions"
              current={plan.branchMetrics.inductions}
              target={plan.targetInductions}
            />
            <ProgressBar
              label="Branch deployments"
              current={plan.branchMetrics.deployments}
              target={plan.targetDeployments}
            />
            {plan.myMetrics && (
              <>
                <p className="pt-2 font-mono text-xs font-medium text-muted-foreground">Your contribution</p>
                <ProgressBar label="Your scouts" current={plan.myMetrics.scouts} target={0} />
                <ProgressBar label="Your inductions" current={plan.myMetrics.inductions} target={0} />
                <ProgressBar label="Your deployments" current={plan.myMetrics.deployments} target={0} />
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-base">My queue</CardTitle>
          <p className="text-sm text-muted-foreground">
            Work orders, tasks, and SLA follow-ups assigned to you.
          </p>
        </CardHeader>
        <CardContent>
          {!data?.items.length ? (
            <p className="font-mono text-sm text-muted-foreground">No pending items. Check the map for new territory work.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.items.map((item, i) => (
                <QueueItemRow
                  key={
                    item.kind === "daily_report"
                      ? "report"
                      : `${item.kind}-${"id" in item ? item.id : i}`
                  }
                  item={item}
                  onWorkOrderStatus={onWorkOrderStatus}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="font-mono">
        <Link href="/">Open territory map</Link>
      </Button>
    </div>
  );
}
