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
import { getUsersForAdmin, getTeamsForAdmin, getBranchesForAdmin, createUser, updateUserRole, updateUser, resetUserPassword } from "@/app/actions/users";
import type { CreateUserData } from "@/app/actions/users";
import type { Role } from "@/lib/auth";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type UserRow = {
  id: string;
  name: string;
  role: string;
  teamName: string | null;
  branchName: string | null;
};

type TeamOption = {
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

export function AdminUsersClient({
  initialUsers,
  totalUsers: initialTotal,
  usersLimit = 20,
  callerRole,
  branchIdFromUrl,
}: {
  initialUsers: UserRow[];
  totalUsers: number;
  usersLimit?: number;
  callerRole: Role;
  branchIdFromUrl?: string | null;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers);
  const [totalUsers, setTotalUsers] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role | "">("");
  const [editProfileUserId, setEditProfileUserId] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);

  const refetch = async (pageOffset = 0) => {
    setLoading(true);
    try {
      const result = await getUsersForAdmin(branchIdFromUrl ?? undefined, {
        limit: usersLimit,
        offset: pageOffset,
      });
      setUsers(result.users);
      setTotalUsers(result.total);
      setPage(Math.floor(pageOffset / usersLimit));
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage < 0 || newPage >= Math.ceil(totalUsers / usersLimit)) return;
    refetch(newPage * usersLimit);
  };

  useEffect(() => {
    setUsers(initialUsers);
    setTotalUsers(initialTotal);
    setPage(0);
  }, [branchIdFromUrl]);

  useEffect(() => {
    getTeamsForAdmin(branchIdFromUrl ?? undefined, { limit: 500, offset: 0 }).then((r) => setTeams(r.teams)).catch(() => setTeams([]));
    getBranchesForAdmin().then(setBranches).catch(() => setBranches([]));
  }, [branchIdFromUrl]);

  const isAdmin = callerRole === "ADMIN";
  const canCreate = callerRole === "ADMIN" || callerRole === "BRANCH_MANAGER";

  return (
    <div className="flex flex-col gap-6 p-4">
      {callerRole === "ADMIN" && branchIdFromUrl && (
        <p className="text-sm text-muted-foreground">
          <Link href="/admin/users" className="hover:text-foreground">← Back to branch list</Link>
        </p>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-mono">Users</CardTitle>
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} className="font-mono">
              Create User
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="min-h-[120px]">
              <PortalLoadingInline className="min-h-[120px]" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users found.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map((u) => (
                <div key={u.id} className="flex flex-col gap-2">
                <div
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card/50 p-3 font-mono text-sm"
                >
                  <div>
                    <span className="text-foreground">{u.name}</span>
                    <span className="ml-2 text-primary">{u.role}</span>
                    {(u.teamName || u.branchName) && (
                      <span className="ml-2 text-muted-foreground">
                        · {[u.teamName, u.branchName].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      {editUserId === u.id ? (
                        <>
                          <Select
                            value={editRole}
                            onValueChange={(v) => setEditRole(v as Role)}
                          >
                            <SelectTrigger className="w-36">
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PLAYER">PLAYER</SelectItem>
                              <SelectItem value="BRANCH_MANAGER">BRANCH_MANAGER</SelectItem>
                              <SelectItem value="ADMIN">ADMIN</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            disabled={!editRole || editRole === u.role}
                            onClick={async () => {
                              if (!editRole || editRole === u.role) return;
                              try {
                                await updateUserRole(u.id, editRole);
                                setEditUserId(null);
                                setEditRole("");
                                await refetch(page * usersLimit);
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditUserId(null); setEditRole(""); }}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setEditUserId(u.id); setEditRole(u.role as Role); }}
                        >
                          Edit Role
                        </Button>
                      )}
                    </div>
                  )}
                  {canCreate && editUserId !== u.id && editProfileUserId !== u.id && resetPasswordUserId !== u.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditProfileUserId(u.id)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setResetPasswordUserId(u.id)}
                      >
                        Reset password
                      </Button>
                    </div>
                  )}
                  </div>
                </div>
                {editProfileUserId === u.id && (
                  <EditProfileForm
                    user={u}
                    teams={teams}
                    onSave={async () => {
                      setEditProfileUserId(null);
                      await refetch(page * usersLimit);
                    }}
                    onCancel={() => setEditProfileUserId(null)}
                  />
                )}
                {resetPasswordUserId === u.id && (
                  <ResetPasswordForm
                    userId={u.id}
                    userName={u.name}
                    onSuccess={async () => {
                      setResetPasswordUserId(null);
                      await refetch(page * usersLimit);
                    }}
                    onCancel={() => setResetPasswordUserId(null)}
                  />
                )}
                </div>
              ))}
            </div>
          )}
          {totalUsers > usersLimit && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <span className="font-mono text-xs text-muted-foreground">
                Page {page + 1} of {Math.ceil(totalUsers / usersLimit)} ({totalUsers} total)
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
                  disabled={page >= Math.ceil(totalUsers / usersLimit) - 1 || loading}
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
        <CreateUserForm
          callerRole={callerRole}
          teams={teams}
          branches={branches}
          onClose={() => setCreateOpen(false)}
          onSuccess={async () => {
            setCreateOpen(false);
            await refetch(page * usersLimit);
          }}
        />
      )}
    </div>
  );
}

function EditProfileForm({
  user,
  teams,
  onSave,
  onCancel,
}: {
  user: UserRow;
  teams: TeamOption[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = teams.find((x) => x.name === user.teamName);
    setTeamId(t?.id ?? null);
  }, [teams, user.teamName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateUser(user.id, { name: name.trim(), teamId });
      onSave();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
      <div className="grid gap-1">
        <Label className="text-xs">Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 font-mono" required />
      </div>
      {teams.length > 0 && (
        <div className="grid gap-1">
          <Label className="text-xs">Team</Label>
          <Select value={teamId ?? ""} onValueChange={(v) => setTeamId(v || null)}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              {teams.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button size="sm" type="submit" disabled={submitting}>Save</Button>
      <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function ResetPasswordForm({
  userId,
  userName,
  onSuccess,
  onCancel,
}: {
  userId: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await resetUserPassword(userId, password);
      if (!res.ok) throw new Error(res.error);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/30 p-3">
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
      <div className="grid gap-1">
        <Label className="text-xs">New password for {userName}</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9 font-mono"
          placeholder="New password"
          required
          minLength={6}
        />
      </div>
      <Button size="sm" type="submit" disabled={submitting || !password}>Reset password</Button>
      <Button size="sm" type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
    </form>
  );
}

function CreateUserForm({
  callerRole,
  teams,
  branches,
  onClose,
  onSuccess,
}: {
  callerRole: Role;
  teams: TeamOption[];
  branches: BranchOption[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("PLAYER");
  const [teamId, setTeamId] = useState<string | null>(null);
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

  const isAdmin = callerRole === "ADMIN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data: CreateUserData = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        teamId: teamId || undefined,
      };
      if (role === "BRANCH_MANAGER" && isAdmin) {
        data.branchId = branchId ?? undefined;
      }
      await createUser(data);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono">Create User</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <p className="text-destructive text-sm">{error}</p>
          )}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="User name"
              required
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters (user must change on first login)"
              required
              minLength={6}
              className="font-mono"
              autoComplete="new-password"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as Role)}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PLAYER">PLAYER</SelectItem>
                {isAdmin && (
                  <>
                    <SelectItem value="BRANCH_MANAGER">BRANCH_MANAGER</SelectItem>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          {teams.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="team">Team (optional)</Label>
              <Select value={teamId ?? ""} onValueChange={(v) => setTeamId(v || null)}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} {t.branchName ? `· ${t.branchName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "BRANCH_MANAGER" && isAdmin && branches.length > 0 && (
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
              <Select value={branchId ?? ""} onValueChange={(v) => setBranchId(v || null)}>
                <SelectTrigger id="branch">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBranches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.companyName} {b.branchCode ? `(${b.branchCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting || !name.trim() || !email.trim() || password.length < 6}>
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
