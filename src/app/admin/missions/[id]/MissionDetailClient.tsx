"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMissionGoal,
  createMissionTask,
} from "@/app/actions/mission";
import { getUsersForAdmin } from "@/app/actions/users";

type Mission = {
  id: string;
  name: string;
  status: string;
  goals: { id: string; title: string; targetValue: number | null; unit: string | null; dueDate: Date | null }[];
  tasks: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    territoryCell?: { id: string; code: string } | null;
    assignee: { id: string; name: string };
  }[];
  branch: { id: string; name: string } | null;
  territoryCell?: { id: string; code: string } | null;
};

export function MissionDetailClient({ mission }: { mission: Mission }) {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  useEffect(() => {
    getUsersForAdmin(undefined, { limit: 200, offset: 0 }).then((result) => setUsers(result.users.map((u) => ({ id: u.id, name: u.name })))).catch(() => setUsers([]));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 p-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="font-mono">
          <Link href="/missions">← Missions</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-mono">{mission.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Status: {mission.status} {mission.branch && `· ${mission.branch.name}`}
            {mission.territoryCell && ` · Cell: ${mission.territoryCell.code}`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold">Goals</h3>
              <Button size="sm" variant="outline" onClick={() => setAddGoalOpen(true)}>
                Add goal
              </Button>
            </div>
            {mission.goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No goals yet.</p>
            ) : (
              <ul className="list-inside list-disc text-sm">
                {mission.goals.map((g) => (
                  <li key={g.id}>
                    {g.title}
                    {g.targetValue != null && ` — ${g.targetValue} ${g.unit ?? ""}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold">Tasks</h3>
              <Button size="sm" variant="outline" onClick={() => setAddTaskOpen(true)}>
                Assign task
              </Button>
            </div>
            {mission.tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {mission.tasks.map((t) => (
                  <li key={t.id}>
                    {t.title} → {t.assignee.name} ({t.status})
                    {t.territoryCell && ` · Cell: ${t.territoryCell.code}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {addGoalOpen && (
        <AddGoalForm
          missionId={mission.id}
          onClose={() => setAddGoalOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
      {addTaskOpen && (
        <AddTaskForm
          missionId={mission.id}
          users={users}
          onClose={() => setAddTaskOpen(false)}
          onSuccess={() => window.location.reload()}
        />
      )}
    </div>
  );
}

function AddGoalForm({
  missionId,
  onClose,
  onSuccess,
}: {
  missionId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createMissionGoal({
        missionId,
        title: title.trim(),
        targetValue: targetValue ? Number(targetValue) : null,
        unit: unit.trim() || null,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Add goal</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>Target value (optional)</Label>
            <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>Unit (optional)</Label>
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. zones, merchants" className="font-mono" />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !title.trim()}>{submitting ? "Adding…" : "Add goal"}</Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AddTaskForm({
  missionId,
  users,
  onClose,
  onSuccess,
}: {
  missionId: string;
  users: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId) return;
    setError(null);
    setSubmitting(true);
    try {
      await createMissionTask({
        missionId,
        assigneeId,
        title: title.trim(),
        description: description.trim() || null,
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-base">Assign task</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required className="font-mono" />
          </div>
          <div className="grid gap-2">
            <Label>Description (optional)</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label>Assign to</Label>
            <select
              value={assigneeId ?? ""}
              onChange={(e) => setAssigneeId(e.target.value || null)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              required
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !title.trim() || !assigneeId}>
              {submitting ? "Assigning…" : "Assign task"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
