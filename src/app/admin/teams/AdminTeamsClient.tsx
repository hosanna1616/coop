"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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
import { createTeam } from "@/app/actions/teams";
import { getTeamsForAdmin, getBranchesForAdmin } from "@/app/actions/users";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type TeamRow = {
  id: string;
  name: string;
  branchId: string | null;
  branchName: string | null;
};

type BranchOption = {
  id: string;
  branchCode: string | null;
  companyName: string;
};

type Role = "ADMIN" | "BRANCH_MANAGER";

export function AdminTeamsClient({
  initialTeams,
  totalTeams: initialTotal,
  teamsLimit = 20,
  callerRole,
  branchIdFromUrl,
}: {
  initialTeams: TeamRow[];
  totalTeams: number;
  teamsLimit?: number;
  callerRole: Role;
  branchIdFromUrl?: string | null;
}) {
  const [teams, setTeams] = useState<TeamRow[]>(initialTeams);
  const [totalTeams, setTotalTeams] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const refetch = async (pageOffset = 0) => {
    setLoading(true);
    try {
      const result = await getTeamsForAdmin(branchIdFromUrl ?? undefined, {
        limit: teamsLimit,
        offset: pageOffset,
      });
      setTeams(result.teams);
      setTotalTeams(result.total);
      setPage(Math.floor(pageOffset / teamsLimit));
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= Math.ceil(totalTeams / teamsLimit)) return;
    refetch(newPage * teamsLimit);
  };

  useEffect(() => {
    setTeams(initialTeams);
    setTotalTeams(initialTotal);
    setPage(0);
  }, [branchIdFromUrl, initialTeams.length, initialTotal]);

  useEffect(() => {
    if (callerRole === "ADMIN") {
      getBranchesForAdmin().then(setBranches).catch(() => setBranches([]));
    }
  }, [callerRole]);

  return (
    <div className="flex flex-col gap-6 p-4">
      {callerRole === "ADMIN" && branchIdFromUrl && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/teams" className="hover:text-foreground">← Back to branch list</Link>
        </p>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-mono">Teams</CardTitle>
          <Button onClick={() => setCreateOpen(true)} className="font-mono">
            Create Team
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="min-h-[120px]">
              <PortalLoadingInline className="min-h-[120px]" />
            </div>
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teams yet. Create a team for your branch below.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {teams.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 p-3 font-mono text-sm"
                >
                  <span className="font-medium text-foreground">{t.name}</span>
                  {t.branchName && (
                    <span className="text-muted-foreground">{t.branchName}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {totalTeams > teamsLimit && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <span className="font-mono text-xs text-muted-foreground">
                Page {page + 1} of {Math.ceil(totalTeams / teamsLimit)} ({totalTeams} total)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0 || loading}
                  onClick={() => goToPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= Math.ceil(totalTeams / teamsLimit) - 1 || loading}
                  onClick={() => goToPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {createOpen && (
        <CreateTeamForm
          callerRole={callerRole}
          branches={branches}
          onClose={() => setCreateOpen(false)}
          onSuccess={async () => {
            setCreateOpen(false);
            await refetch(page * teamsLimit);
          }}
        />
      )}
    </div>
  );
}

function CreateTeamForm({
  callerRole,
  branches,
  onClose,
  onSuccess,
}: {
  callerRole: Role;
  branches: BranchOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branchSearch, setBranchSearch] = useState("");

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter(
      (b) =>
        b.companyName.toLowerCase().includes(q) ||
        (b.branchCode?.toLowerCase().includes(q) ?? false)
    );
  }, [branches, branchSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createTeam({
        name: name.trim(),
        ...(callerRole === "ADMIN" && { branchId: branchId ?? undefined }),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono">Create Team</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {callerRole === "ADMIN" && (
            <div className="grid gap-2">
              <Label htmlFor="branch-search">Search branch</Label>
              <Input
                id="branch-search"
                type="search"
                placeholder="Type to filter by name or code…"
                value={branchSearch}
                onChange={(e) => setBranchSearch(e.target.value)}
                className="font-mono"
              />
              <Label htmlFor="branch">Branch</Label>
              <Select
                value={branchId ?? ""}
                onValueChange={(v) => setBranchId(v || null)}
                required
              >
                <SelectTrigger id="branch" className="font-mono">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBranches.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="font-mono">
                      {b.companyName} {b.branchCode ? `(${b.branchCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Team name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales A"
              required
              className="font-mono"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={
                submitting ||
                !name.trim() ||
                (callerRole === "ADMIN" && !branchId)
              }
            >
              {submitting ? "Creating…" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
