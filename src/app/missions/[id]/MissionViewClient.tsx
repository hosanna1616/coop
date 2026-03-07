"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type MissionViewClientProps = {
  mission: {
    id: string;
    name: string;
    status: string;
    goals: { id: string; title: string; targetValue: number | null; unit: string | null }[];
    tasks: {
      id: string;
      title: string;
      status: string;
      assignee: { id: string; name: string };
      territoryCell: { id: string; code: string } | null;
    }[];
    branch: { id: string; name: string } | null;
    territoryCell: { id: string; code: string } | null;
  };
  role: string;
  branchId: string | null;
};

export function MissionViewClient({ mission, role, branchId }: MissionViewClientProps) {
  const taskHref = (taskId: string) =>
    branchId ? `/missions/task/${taskId}?branchId=${encodeURIComponent(branchId)}` : `/missions/task/${taskId}`;
  const manageHref = branchId
    ? `/admin/missions/${mission.id}?branchId=${encodeURIComponent(branchId)}`
    : `/admin/missions/${mission.id}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="font-mono">
            <Link href={branchId ? `/missions?branchId=${encodeURIComponent(branchId)}` : "/missions"}>
              ← Missions
            </Link>
          </Button>
        </div>
        {(role === "BRANCH_MANAGER" || role === "ADMIN") && (
          <Button asChild size="sm" variant="outline" className="font-mono">
            <Link href={manageHref}>Manage goals & tasks</Link>
          </Button>
        )}
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{mission.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Status: {mission.status}
            {mission.branch && ` · ${mission.branch.name}`}
            {mission.territoryCell && ` · Cell: ${mission.territoryCell.code}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {mission.goals.length > 0 && (
            <div>
              <h3 className="mb-2 font-mono text-sm font-semibold">Goals</h3>
              <ul className="list-inside list-disc text-sm text-muted-foreground">
                {mission.goals.map((g) => (
                  <li key={g.id}>
                    {g.title}
                    {g.targetValue != null && ` — ${g.targetValue} ${g.unit ?? ""}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div>
            <h3 className="mb-2 font-mono text-sm font-semibold">Tasks</h3>
            {mission.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {mission.tasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-2">
                    <span>
                      {t.title} → {t.assignee.name} ({TASK_STATUS_LABELS[t.status] ?? t.status})
                      {t.territoryCell && (
                        <span className="ml-1 text-muted-foreground">· Cell: {t.territoryCell.code}</span>
                      )}
                    </span>
                    <Button asChild size="sm" variant="link" className="h-auto p-0 font-mono text-xs">
                      <Link href={taskHref(t.id)}>View</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
