"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateMissionTaskStatus, getMissions } from "@/app/actions/mission";
import { useState, useEffect } from "react";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

type Mission = {
  id: string;
  name: string;
  status: string;
  territoryCell?: { id: string; code: string } | null;
  goals: { id: string; title: string; targetValue: number | null; unit: string | null }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    territoryCell?: { id: string; code: string } | null;
    assignee: { id: string; name: string };
  }[];
};

type MyTask = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  mission: { id: string; name: string; status: string };
  territoryCell?: { id: string; code: string } | null;
};

type PendingTask = {
  id: string;
  title: string;
  status: string;
  completedAt: Date | null;
  mission: { id: string; name: string };
  assignee: { id: string; name: string };
};

type MyScoutedLead = {
  id: string;
  businessName: string;
  category: string;
  status: string;
  createdAt: Date;
  zoneCode: string | null;
};

type MyInductedMerchant = {
  id: string;
  ownerName: string;
  citizenNumber: string;
  onboardingDate: Date;
  businessName: string;
  category: string;
};

export function MissionsClient({
  missions: initialMissions,
  totalMissions,
  missionsLimit = 20,
  myTasks,
  pendingApprovals,
  myScoutedLeads = [],
  myInductedMerchants = [],
  role,
  branchId,
  branchName,
}: {
  missions: Mission[];
  totalMissions: number;
  missionsLimit?: number;
  myTasks: MyTask[];
  pendingApprovals: PendingTask[];
  myScoutedLeads?: MyScoutedLead[];
  myInductedMerchants?: MyInductedMerchant[];
  role: string;
  branchId?: string | null;
  branchName?: string | null;
}) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [missionsPage, setMissionsPage] = useState(0);
  const [missionsLoading, setMissionsLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMissionsPage = async (page: number) => {
    if (page < 0 || page >= Math.ceil(totalMissions / missionsLimit)) return;
    setMissionsLoading(true);
    try {
      const result = await getMissions({
        branchId: branchId ?? undefined,
        limit: missionsLimit,
        offset: page * missionsLimit,
      });
      setMissions(result.missions);
      setMissionsPage(page);
    } finally {
      setMissionsLoading(false);
    }
  };

  useEffect(() => {
    setMissions(initialMissions);
    setMissionsPage(0);
  }, [branchId]);

  const canMarkComplete = (status: string) =>
    role === "PLAYER" && (status === "PENDING" || status === "IN_PROGRESS");
  const canApprove = role === "BRANCH_MANAGER" || role === "ADMIN";

  const handleApprove = async (taskId: string, approved: boolean) => {
    setError(null);
    setSubmitting(taskId);
    try {
      const res = await updateMissionTaskStatus(
        taskId,
        approved ? "APPROVED" : "REJECTED"
      );
      if (!res.ok) throw new Error(res.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex min-w-0 items-center gap-2">
          {role === "ADMIN" && branchId && (
            <Link
              href="/admin/branches"
              className="font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              ← Branches
            </Link>
          )}
          <h1 className="font-mono text-lg font-semibold text-foreground">
            MISSIONS BRIEFING
            {branchName ? ` · ${branchName}` : ""}
          </h1>
        </div>
        {(role === "BRANCH_MANAGER" || role === "ADMIN") && (
          <Button asChild size="sm" className="font-mono">
            <Link href={branchId ? `/admin/missions/create?branchId=${encodeURIComponent(branchId)}` : "/admin/missions/create"}>
              New Mission
            </Link>
          </Button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {pendingApprovals.length > 0 && canApprove && (
          <section>
            <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
              PENDING APPROVALS
            </h2>
            <ul className="flex flex-col gap-3">
              {pendingApprovals.map((t) => (
                <li key={t.id}>
                  <Card className="border-border bg-card text-card-foreground">
                    <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-primary">
                          {t.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mission: {t.mission.name} · By {t.assignee.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm" variant="outline" className="font-mono">
                          <Link href={branchId ? `/missions/task/${t.id}?branchId=${encodeURIComponent(branchId)}` : `/missions/task/${t.id}`}>View</Link>
                        </Button>
                        <Button
                          size="sm"
                          className="font-mono"
                          disabled={submitting === t.id}
                          onClick={() => handleApprove(t.id, true)}
                        >
                          {submitting === t.id ? "…" : "Approve"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-mono"
                          disabled={submitting === t.id}
                          onClick={() => handleApprove(t.id, false)}
                        >
                          {submitting === t.id ? "…" : "Reject"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
            MY TASKS
          </h2>
          {myTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned to you.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {myTasks.map((t) => (
                <li key={t.id}>
                  <Card className="border-border bg-card text-card-foreground">
                    <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-sm font-semibold text-primary">
                          {t.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {t.mission.name} · {TASK_STATUS_LABELS[t.status] ?? t.status}
                          {t.territoryCell && ` · Cell: ${t.territoryCell.code}`}
                        </p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="font-mono shrink-0"
                      >
                        <Link href={branchId ? `/missions/task/${t.id}?branchId=${encodeURIComponent(branchId)}` : `/missions/task/${t.id}`}>
                          {canMarkComplete(t.status) ? "View details" : "View"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(role === "BRANCH_MANAGER" || role === "PLAYER") && (myScoutedLeads.length > 0 || myInductedMerchants.length > 0) && (
          <section>
            <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
              SCOUTED & REGISTERED BY ME
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Leads you scouted and merchants you inducted in this branch.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm font-semibold text-primary">
                    Scouted ({myScoutedLeads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myScoutedLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No unconverted leads scouted by you.</p>
                  ) : (
                    <ul className="space-y-2">
                      {myScoutedLeads.slice(0, 10).map((l) => (
                        <li key={l.id}>
                          <Link
                            href={`/induct/${l.id}`}
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {l.businessName}
                          </Link>
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {l.category}
                            {l.zoneCode && ` · ${l.zoneCode}`}
                          </span>
                        </li>
                      ))}
                      {myScoutedLeads.length > 10 && (
                        <li>
                          <Link href="/merchants" className="font-mono text-xs text-muted-foreground hover:underline">
                            +{myScoutedLeads.length - 10} more →
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border bg-card text-card-foreground">
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm font-semibold text-primary">
                    Registered ({myInductedMerchants.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {myInductedMerchants.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No merchants inducted by you yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {myInductedMerchants.slice(0, 10).map((m) => (
                        <li key={m.id}>
                          <Link
                            href="/merchants"
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {m.businessName || m.ownerName}
                          </Link>
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {m.category} · {new Date(m.onboardingDate).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                      {myInductedMerchants.length > 10 && (
                        <li>
                          <Link href="/merchants" className="font-mono text-xs text-muted-foreground hover:underline">
                            +{myInductedMerchants.length - 10} more →
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
            MISSIONS & GOALS
          </h2>
          {missionsLoading ? (
            <div className="min-h-[120px]">
              <PortalLoadingInline className="min-h-[120px]" />
            </div>
          ) : missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No missions for your branch.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {missions.map((m) => (
                <li key={m.id}>
                  <Card className="border-border bg-card text-card-foreground">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-mono text-base font-semibold text-primary">
                        {m.name}
                      </CardTitle>
                      <p className="font-mono text-xs text-muted-foreground">
                        Status: {m.status}
                        {m.territoryCell && ` · Cell: ${m.territoryCell.code}`}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {m.goals.length > 0 && (
                        <div>
                          <p className="mb-1 font-mono text-xs font-medium text-muted-foreground">
                            Goals
                          </p>
                          <ul className="list-inside list-disc text-sm text-muted-foreground">
                            {m.goals.map((g) => (
                              <li key={g.id}>
                                {g.title}
                                {g.targetValue != null && ` — ${g.targetValue} ${g.unit ?? ""}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {m.tasks.length > 0 && (
                        <div>
                          <p className="mb-1 font-mono text-xs font-medium text-muted-foreground">
                            Assigned
                          </p>
                          <ul className="text-xs text-muted-foreground">
                            {m.tasks.map((t) => (
                              <li key={t.id}>
                                {t.title} → {t.assignee.name} ({TASK_STATUS_LABELS[t.status]})
                                {t.territoryCell && ` · ${t.territoryCell.code}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(role === "BRANCH_MANAGER" || role === "ADMIN") && (
                        <Button asChild size="sm" variant="outline" className="mt-2 font-mono">
                          <Link href={branchId ? `/admin/missions/${m.id}?branchId=${encodeURIComponent(branchId)}` : `/admin/missions/${m.id}`}>Manage goals & tasks</Link>
                        </Button>
                      )}
                      {(role === "PLAYER" || role === "BRANCH_MANAGER" || role === "ADMIN") && (
                        <Button asChild size="sm" variant="outline" className="mt-2 font-mono">
                          <Link href={branchId ? `/missions/${m.id}?branchId=${encodeURIComponent(branchId)}` : `/missions/${m.id}`}>
                            {role === "PLAYER" ? "View mission" : "View"}
                          </Link>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          {totalMissions > missionsLimit && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <span className="font-mono text-xs text-muted-foreground">
                Page {missionsPage + 1} of {Math.ceil(totalMissions / missionsLimit)} ({totalMissions} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={missionsPage === 0 || missionsLoading}
                  onClick={() => loadMissionsPage(missionsPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={missionsPage >= Math.ceil(totalMissions / missionsLimit) - 1 || missionsLoading}
                  onClick={() => loadMissionsPage(missionsPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
