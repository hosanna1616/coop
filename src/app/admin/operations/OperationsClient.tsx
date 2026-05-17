"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  createWorkOrder,
  getDailyRollup,
  getOperatingPlan,
  listBranchPlayers,
  listBranchWorkOrders,
  updateBranchFieldBrief,
  upsertOperatingPlan,
} from "@/app/actions/field-operations";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import { WORK_ORDER_OBJECTIVE_LABELS } from "@/lib/field-operations";
import type { WorkOrderObjective } from "@prisma/client";

export function OperationsClient({ branchId }: { branchId: string | null }) {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [targetScouts, setTargetScouts] = useState(0);
  const [targetInductions, setTargetInductions] = useState(0);
  const [targetDeployments, setTargetDeployments] = useState(0);
  const [planNotes, setPlanNotes] = useState("");
  const [fieldBrief, setFieldBrief] = useState("");
  const [woTitle, setWoTitle] = useState("");
  const [woAssignee, setWoAssignee] = useState("");
  const [woObjective, setWoObjective] = useState<WorkOrderObjective>("GENERAL");
  const [woDue, setWoDue] = useState("");
  const [woDesc, setWoDesc] = useState("");
  const [workOrders, setWorkOrders] = useState<
    Awaited<ReturnType<typeof listBranchWorkOrders>>
  >([]);
  const [rollup, setRollup] = useState<Awaited<ReturnType<typeof getDailyRollup>> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [plan, pl, orders, roll] = await Promise.all([
        getOperatingPlan(branchId),
        listBranchPlayers(branchId),
        listBranchWorkOrders(branchId),
        getDailyRollup(branchId),
      ]);
      if (plan) {
        setTargetScouts(plan.targetScouts);
        setTargetInductions(plan.targetInductions);
        setTargetDeployments(plan.targetDeployments);
        setPlanNotes(plan.notes ?? "");
        setFieldBrief(plan.fieldBrief ?? "");
      }
      setPlayers(pl);
      setWorkOrders(orders);
      setRollup(roll);
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!branchId) {
    return (
      <p className="p-4 font-mono text-sm text-muted-foreground">
        Assign your account to a branch to manage field operations.
      </p>
    );
  }

  if (loading) return <PortalLoadingInline className="min-h-[200px] w-full p-4" />;

  const savePlan = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await upsertOperatingPlan({
        branchId,
        targetScouts,
        targetInductions,
        targetDeployments,
        notes: planNotes || null,
      });
      setMessage("Weekly operating plan saved.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const saveBrief = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateBranchFieldBrief(branchId, fieldBrief);
      setMessage("Field brief saved for officers.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to save brief");
    } finally {
      setSaving(false);
    }
  };

  const submitWorkOrder = async () => {
    if (!woTitle.trim() || !woAssignee || !woDue) {
      setMessage("Work order needs title, assignee, and due date.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await createWorkOrder({
        branchId,
        assigneeId: woAssignee,
        title: woTitle,
        description: woDesc || null,
        objective: woObjective,
        dueAt: new Date(woDue).toISOString(),
      });
      setWoTitle("");
      setWoDesc("");
      setMessage("Work order assigned.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed to create work order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-24">
      {message && (
        <p className="rounded-md border border-border bg-muted/50 p-2 font-mono text-xs text-foreground">
          {message}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Weekly operating plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="font-mono text-xs">Target scouts</Label>
            <Input
              type="number"
              min={0}
              value={targetScouts}
              onChange={(e) => setTargetScouts(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label className="font-mono text-xs">Target inductions</Label>
            <Input
              type="number"
              min={0}
              value={targetInductions}
              onChange={(e) => setTargetInductions(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label className="font-mono text-xs">Target deployments</Label>
            <Input
              type="number"
              min={0}
              value={targetDeployments}
              onChange={(e) => setTargetDeployments(Number(e.target.value) || 0)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label className="font-mono text-xs">Notes for officers</Label>
            <Input
              value={planNotes}
              onChange={(e) => setPlanNotes(e.target.value)}
              placeholder="e.g. Focus Bole 4 sector this week"
            />
          </div>
          <Button disabled={saving} onClick={savePlan} className="font-mono sm:col-span-3">
            Save weekly plan
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Field brief (shown on officer queue)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            value={fieldBrief}
            onChange={(e) => setFieldBrief(e.target.value)}
            placeholder="Priority areas, competitor focus, weekly emphasis…"
          />
          <Button disabled={saving} variant="outline" onClick={saveBrief} className="font-mono">
            Save field brief
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Assign work order</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <Label className="font-mono text-xs">Title</Label>
            <Input value={woTitle} onChange={(e) => setWoTitle(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="font-mono text-xs">Officer</Label>
              <Select value={woAssignee} onValueChange={setWoAssignee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select officer" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-mono text-xs">Objective</Label>
              <Select
                value={woObjective}
                onValueChange={(v) => setWoObjective(v as WorkOrderObjective)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WORK_ORDER_OBJECTIVE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="font-mono text-xs">Due date</Label>
            <Input type="datetime-local" value={woDue} onChange={(e) => setWoDue(e.target.value)} />
          </div>
          <div>
            <Label className="font-mono text-xs">Description (optional)</Label>
            <Input value={woDesc} onChange={(e) => setWoDesc(e.target.value)} />
          </div>
          <Button disabled={saving} onClick={submitWorkOrder} className="font-mono">
            Assign work order
          </Button>
        </CardContent>
      </Card>

      {rollup && (
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-sm">Today&apos;s field roll-up</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-xs">
            {rollup.missingOfficers.length > 0 && (
              <p className="text-amber-600 dark:text-amber-400">
                Missing report: {rollup.missingOfficers.join(", ")}
              </p>
            )}
            {rollup.reports.length === 0 ? (
              <p className="text-muted-foreground">No reports filed today yet.</p>
            ) : (
              <ul className="space-y-2">
                {rollup.reports.map((r) => (
                  <li key={r.id} className="rounded border border-border p-2">
                    <p className="font-semibold text-foreground">{r.officerName}</p>
                    {r.planNotes && <p>Plan: {r.planNotes}</p>}
                    {r.closeoutNotes && <p>Closeout: {r.closeoutNotes}</p>}
                    {r.blockers && <p className="text-destructive">Blockers: {r.blockers}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-mono text-sm">Recent work orders</CardTitle>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <p className="font-mono text-xs text-muted-foreground">No work orders yet.</p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {workOrders.map((wo) => (
                <li key={wo.id} className="flex justify-between border-b border-border/50 pb-2">
                  <span>
                    {wo.title} · {wo.assignee.name} · {wo.status}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(wo.dueAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
