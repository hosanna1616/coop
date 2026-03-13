"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TerritoryCellWithCoords } from "@/app/actions/branch-territory";
import type { MapZoneStatus } from "@/lib/zoneStatusColors";
import { CellMerchantsPanel } from "./CellMerchantsPanel";
import { getMissions } from "@/app/actions/mission";
import { getUsersForAdmin } from "@/app/actions/users";
import { createMissionTask } from "@/app/actions/mission";

const STATUS_BADGE_CLASS: Record<MapZoneStatus, string> = {
  UNSEEN: "bg-muted",
  SCOUTED: "bg-primary",
  CAPTURED: "bg-green-600",
  FORTIFIED: "bg-orange-500",
  AT_RISK: "bg-secondary",
  LOST: "bg-red-900",
};

const ALL_STATUSES: MapZoneStatus[] = ["UNSEEN", "SCOUTED", "CAPTURED", "FORTIFIED", "AT_RISK", "LOST"];

export interface TerritoryCellDrawerProps {
  cell: TerritoryCellWithCoords;
  onClose: () => void;
  onSave?: (data: { status: MapZoneStatus; label: string | null }) => void | Promise<void>;
  branchName?: string;
  /** When set, show "Create mission" and "Assign task" for this cell (branch manager / admin) */
  branchId?: string | null;
  readOnly?: boolean;
}

export function TerritoryCellDrawer({ cell, onClose, onSave, branchName, branchId: branchIdProp, readOnly = false }: TerritoryCellDrawerProps) {
  const branchId = branchIdProp ?? ("branchId" in cell ? (cell as { branchId?: string }).branchId : null);
  const [status, setStatus] = useState<MapZoneStatus>(cell.status as MapZoneStatus);
  const [label, setLabel] = useState(cell.label ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [assignTaskOpen, setAssignTaskOpen] = useState(false);
  const [missions, setMissions] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [taskMissionId, setTaskMissionId] = useState<string | null>(null);
  const [taskAssigneeId, setTaskAssigneeId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskSubmitting, setTaskSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    if (assignTaskOpen && branchId) {
      getMissions({ branchId, limit: 50, offset: 0 }).then((r) => setMissions(r.missions.map((m) => ({ id: m.id, name: m.name })))).catch(() => setMissions([]));
      getUsersForAdmin(branchId, { limit: 100 }).then((r) => setUsers(r.users.filter((u) => u.role === "PLAYER").map((u) => ({ id: u.id, name: u.name })))).catch(() => setUsers([]));
    }
  }, [assignTaskOpen, branchId]);

  const handleSave = async () => {
    if (!onSave) return;
    setSubmitting(true);
    try {
      await onSave({
        status,
        label: label.trim() || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (readOnly) {
    return (
      <>
        <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
          <div className="flex min-w-0 flex-col gap-2">
            <DrawerTitle className="font-mono text-xl text-primary">
              {cell.code}
            </DrawerTitle>
            <span
              className={cn(
                "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
                STATUS_BADGE_CLASS[(cell.status as MapZoneStatus) ?? "UNSEEN"]
              )}
            >
              {(cell.status as string).replace("_", " ")}
            </span>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-6 font-mono text-sm">
          {branchName != null && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Branch:</span> {branchName}
            </p>
          )}
          <p className="text-foreground">
            <span className="text-muted-foreground">Status:</span> {(cell.status as string).replace("_", " ")}
          </p>
          <p className="text-foreground">
            <span className="text-muted-foreground">Label:</span> {cell.label ?? "—"}
          </p>
          <CellMerchantsPanel
            zoneCode={cell.code}
            branchId={branchId ?? undefined}
            cellCoordinates={cell.coordinates}
          />
        </div>
      </>
    );
  }
  return (
    <>
      <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
        <div className="flex min-w-0 flex-col gap-2">
          <DrawerTitle className="font-mono text-xl text-primary">
            {cell.code}
          </DrawerTitle>
          <span
            className={cn(
              "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
              STATUS_BADGE_CLASS[status as MapZoneStatus]
            )}
          >
            {(status as string).replace("_", " ")}
          </span>
        </div>
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </Button>
        </DrawerClose>
      </DrawerHeader>

      <div className="flex flex-col gap-6 px-4 pb-6">
        <section className="flex flex-col gap-3 font-mono text-sm">
          <div>
            <label className="text-muted-foreground text-xs">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as MapZoneStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs">Label (optional)</label>
            <Input
              className="mt-1 font-mono"
              placeholder="e.g. North sector"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </section>

        <Button
          className="h-12 font-mono"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save"}
        </Button>

        {branchId && (
          <section className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="font-mono text-xs font-medium text-muted-foreground">Missions & tasks</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" className="font-mono">
                <Link href={`/admin/missions/create?branchId=${encodeURIComponent(branchId)}&territoryCellId=${encodeURIComponent(cell.id)}`}>
                  Create mission for this cell
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-mono"
                onClick={() => setAssignTaskOpen(true)}
              >
                Assign task for this cell
              </Button>
            </div>
          </section>
        )}

        {assignTaskOpen && branchId && (
          <AssignTaskModal
            cellId={cell.id}
            cellCode={cell.code}
            branchId={branchId}
            missions={missions}
            users={users}
            taskMissionId={taskMissionId}
            taskAssigneeId={taskAssigneeId}
            taskTitle={taskTitle}
            taskDescription={taskDescription}
            taskSubmitting={taskSubmitting}
            taskError={taskError}
            onMissionChange={setTaskMissionId}
            onAssigneeChange={setTaskAssigneeId}
            onTitleChange={setTaskTitle}
            onDescriptionChange={setTaskDescription}
            onSubmit={async () => {
              if (!taskMissionId || !taskAssigneeId || !taskTitle.trim()) return;
              setTaskError(null);
              setTaskSubmitting(true);
              try {
                await createMissionTask({
                  missionId: taskMissionId,
                  assigneeId: taskAssigneeId,
                  title: taskTitle.trim(),
                  description: taskDescription.trim() || null,
                  territoryCellId: cell.id,
                });
                setAssignTaskOpen(false);
                setTaskMissionId(null);
                setTaskAssigneeId(null);
                setTaskTitle("");
                setTaskDescription("");
                window.location.reload();
              } catch (e) {
                setTaskError(e instanceof Error ? e.message : "Failed");
              } finally {
                setTaskSubmitting(false);
              }
            }}
            onClose={() => {
              setAssignTaskOpen(false);
              setTaskError(null);
            }}
          />
        )}

        <CellMerchantsPanel
          zoneCode={cell.code}
          branchId={branchId ?? undefined}
          cellCoordinates={cell.coordinates}
        />
      </div>
    </>
  );
}

function AssignTaskModal({
  cellCode,
  missions,
  users,
  taskMissionId,
  taskAssigneeId,
  taskTitle,
  taskDescription,
  taskSubmitting,
  taskError,
  onMissionChange,
  onAssigneeChange,
  onTitleChange,
  onDescriptionChange,
  onSubmit,
  onClose,
}: {
  cellId: string;
  cellCode: string;
  branchId: string;
  missions: { id: string; name: string }[];
  users: { id: string; name: string }[];
  taskMissionId: string | null;
  taskAssigneeId: string | null;
  taskTitle: string;
  taskDescription: string;
  taskSubmitting: boolean;
  taskError: string | null;
  onMissionChange: (v: string | null) => void;
  onAssigneeChange: (v: string | null) => void;
  onTitleChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit: () => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-mono text-base">Assign task for cell {cellCode}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {taskError && <p className="text-sm text-destructive">{taskError}</p>}
        <div className="grid gap-2">
          <Label className="font-mono text-xs">Mission</Label>
          <Select value={taskMissionId ?? ""} onValueChange={(v) => onMissionChange(v || null)}>
            <SelectTrigger><SelectValue placeholder="Select mission" /></SelectTrigger>
            <SelectContent>
              {missions.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="font-mono text-xs">Assign to</Label>
          <Select value={taskAssigneeId ?? ""} onValueChange={(v) => onAssigneeChange(v || null)}>
            <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label className="font-mono text-xs">Title</Label>
          <Input value={taskTitle} onChange={(e) => onTitleChange(e.target.value)} placeholder="Task title" className="font-mono" />
        </div>
        <div className="grid gap-2">
          <Label className="font-mono text-xs">Description (optional)</Label>
          <textarea
            value={taskDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Task description"
            className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" disabled={taskSubmitting || !taskMissionId || !taskAssigneeId || !taskTitle.trim()} onClick={onSubmit}>
            {taskSubmitting ? "Assigning…" : "Assign task"}
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
