"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { updateMissionTaskStatus } from "@/app/actions/mission";
import { createLeadForTaskReport } from "@/app/actions/leads";

const TASK_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const TASK_REPORT_TYPES = [
  { value: "SCOUTED", label: "Scouted" },
  { value: "CAPTURED", label: "Captured" },
  { value: "FORTIFIED", label: "Fortified" },
];

const CATEGORIES = ["Cafe", "Retail", "Kiosk"] as const;

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  completionNotes: string | null;
  mission: {
    id: string;
    name: string;
    status: string;
    goals: { id: string; title: string; targetValue: number | null; unit: string | null }[];
  };
  assignee: { id: string; name: string };
  territoryCell?: { id: string; code: string } | null;
  taskReportLeads: {
    id: string;
    businessName: string;
    category: string;
    locationLat: number;
    locationLng: number;
    taskReportType: string | null;
  }[];
};

export function TaskDetailClient({
  task: initialTask,
  role,
}: {
  task: TaskDetail;
  role: string;
}) {
  const [task, setTask] = useState(initialTask);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState(task.completionNotes ?? "");

  const canAccept = role === "PLAYER" && task.status === "PENDING";
  const canAddAndSubmit =
    role === "PLAYER" && (task.status === "PENDING" || task.status === "IN_PROGRESS");
  const isSubmitted = task.status === "SUBMITTED" || task.status === "APPROVED" || task.status === "REJECTED";
  const canApprove = (role === "BRANCH_MANAGER" || role === "ADMIN") && task.status === "SUBMITTED";

  const handleAccept = async () => {
    setError(null);
    setSubmitting("accept");
    try {
      const res = await updateMissionTaskStatus(task.id, "IN_PROGRESS");
      if (!res.ok) throw new Error(res.error);
      setTask((t) => ({ ...t, status: "IN_PROGRESS" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setSubmitting("submit");
    try {
      const res = await updateMissionTaskStatus(task.id, "SUBMITTED", {
        completionNotes: completionNotes.trim() || null,
      });
      if (!res.ok) throw new Error(res.error);
      setTask((t) => ({ ...t, status: "SUBMITTED", completionNotes: completionNotes.trim() || null }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  const handleApprove = async (approved: boolean) => {
    setError(null);
    setSubmitting(approved ? "approve" : "reject");
    try {
      const res = await updateMissionTaskStatus(
        task.id,
        approved ? "APPROVED" : "REJECTED"
      );
      if (!res.ok) throw new Error(res.error);
      setTask((t) => ({ ...t, status: approved ? "APPROVED" : "REJECTED" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(null);
    }
  };

  const refetchTask = async () => {
    try {
      const { getTaskByIdForAssignee } = await import("@/app/actions/mission");
      const updated = await getTaskByIdForAssignee(task.id);
      if (updated) setTask(JSON.parse(JSON.stringify(updated)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4">
        <Link href="/missions" className="font-mono text-sm text-muted-foreground">
          ← Missions
        </Link>
        <h1 className="font-mono text-lg font-semibold text-foreground">Task</h1>
        <span />
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-mono text-base font-semibold text-primary">
              {task.title}
            </CardTitle>
            <p className="font-mono text-xs text-muted-foreground">
              Mission: {task.mission.name} · {TASK_STATUS_LABELS[task.status] ?? task.status}
              {task.territoryCell && ` · Cell: ${task.territoryCell.code}`}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.description && (
              <p className="text-sm text-muted-foreground">{task.description}</p>
            )}
            {task.mission.goals.length > 0 && (
              <div>
                <p className="mb-1 font-mono text-xs font-medium text-muted-foreground">Goals</p>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {task.mission.goals.map((g) => (
                    <li key={g.id}>
                      {g.title}
                      {g.targetValue != null && ` — ${g.targetValue} ${g.unit ?? ""}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canAccept && (
              <Button
                className="font-mono w-full"
                disabled={submitting !== null}
                onClick={handleAccept}
              >
                {submitting === "accept" ? "…" : "Accept task"}
              </Button>
            )}
          </CardContent>
        </Card>

        {canAddAndSubmit && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-mono text-sm font-semibold">
                  Registered merchants ({task.taskReportLeads.length})
                </CardTitle>
                <Button
                  size="sm"
                  className="font-mono"
                  variant="outline"
                  onClick={() => setAddOpen(true)}
                >
                  Add merchant
                </Button>
              </CardHeader>
              <CardContent>
                {task.taskReportLeads.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No merchants added yet. Tap &quot;Add merchant&quot; to register locations.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {task.taskReportLeads.map((lead) => (
                      <li
                        key={lead.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{lead.businessName}</span>
                        <span className="text-muted-foreground">{lead.category}</span>
                        {lead.taskReportType && (
                          <span className="text-xs text-muted-foreground">
                            {lead.taskReportType}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {lead.locationLat.toFixed(5)}, {lead.locationLng.toFixed(5)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm font-semibold">
                  Completion notes (optional)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Describe what you did..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                />
              </CardContent>
            </Card>

            <Button
              className="font-mono w-full"
              disabled={submitting !== null}
              onClick={handleSubmit}
            >
              {submitting === "submit" ? "…" : "Submit task for approval"}
            </Button>
          </>
        )}

        {isSubmitted && (
          <Card>
            <CardContent className="pt-4">
              <p className="font-mono text-sm font-semibold text-primary">
                {task.status === "SUBMITTED"
                  ? "Submitted for approval"
                  : task.status === "APPROVED"
                    ? "Approved"
                    : "Rejected"}
              </p>
              {task.completionNotes && (
                <p className="mt-2 text-sm text-muted-foreground">{task.completionNotes}</p>
              )}
              {task.taskReportLeads.length > 0 && (
                <div className="mt-3">
                  <p className="font-mono text-xs font-medium text-muted-foreground">
                    Reported merchants ({task.taskReportLeads.length})
                  </p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {task.taskReportLeads.map((lead) => (
                      <li
                        key={lead.id}
                        className="rounded border border-border bg-muted/30 px-2 py-1.5 text-xs"
                      >
                        {lead.businessName} · {lead.category}
                        {lead.taskReportType && ` · ${lead.taskReportType}`} —{" "}
                        {lead.locationLat.toFixed(5)}, {lead.locationLng.toFixed(5)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {canApprove && (
                <div className="mt-4 flex gap-2">
                  <Button
                    className="font-mono"
                    disabled={submitting !== null}
                    onClick={() => handleApprove(true)}
                  >
                    {submitting === "approve" ? "…" : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    className="font-mono"
                    disabled={submitting !== null}
                    onClick={() => handleApprove(false)}
                  >
                    {submitting === "reject" ? "…" : "Reject"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {addOpen && (
        <AddMerchantForm
          taskId={task.id}
          onClose={() => setAddOpen(false)}
          onSuccess={() => {
            setAddOpen(false);
            refetchTask();
          }}
        />
      )}
    </div>
  );
}

function AddMerchantForm({
  taskId,
  onClose,
  onSuccess,
}: {
  taskId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState<string>("Retail");
  const [taskReportType, setTaskReportType] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator?.geolocation) {
      setGeoError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => setGeoError("Location unavailable"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (lat == null || lng == null) {
      setError("Position is required. Allow location access or enter coordinates.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createLeadForTaskReport({
        missionTaskId: taskId,
        businessName: businessName.trim(),
        category,
        locationLat: lat,
        locationLng: lng,
        estimatedVolume: "MEDIUM",
        taskReportType: taskReportType ?? undefined,
      });
      if (res.ok) onSuccess();
      else setError(res.error ?? "Failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto sm:rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-mono text-base">Add merchant</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            {geoError && (
              <p className="text-xs text-muted-foreground">{geoError}. Enter coordinates below.</p>
            )}
            <div className="grid gap-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Joe's Cafe"
                required
                className="font-mono"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className="font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type (optional)</Label>
              <Select value={taskReportType ?? ""} onValueChange={(v) => setTaskReportType(v || null)}>
                <SelectTrigger className="font-mono">
                  <SelectValue placeholder="Scouted / Captured / Fortified" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Position</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Lat"
                  value={lat ?? ""}
                  onChange={(e) => setLat(e.target.value ? Number(e.target.value) : null)}
                  className="font-mono"
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Lng"
                  value={lng ?? ""}
                  onChange={(e) => setLng(e.target.value ? Number(e.target.value) : null)}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use current location (auto-filled) or enter coordinates.
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || lat == null || lng == null}>
                {submitting ? "Adding…" : "Add"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
