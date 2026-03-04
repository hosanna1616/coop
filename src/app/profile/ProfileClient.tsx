"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Users, Target, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, changePassword } from "@/app/actions/auth";

type UserRow = {
  id: string;
  name: string;
  rank: string;
  xp: number;
  zones: number;
  rankLabel: string;
};

export function ProfileClient({
  user,
  stats,
  leaderboard,
  currentUserId,
  isBranchLeaderboard = false,
}: {
  user: {
    id: string;
    name: string;
    rank: string;
    role: string;
    xp: number;
    rankLabel: string;
    teamName: string | null;
    progressFraction: number;
    nextTierMax: number | null;
  };
  stats: {
    zonesScouted: number;
    merchantsInducted: number;
    zonesCaptured: number;
    missionsCompleted?: number;
  };
  leaderboard: UserRow[];
  currentUserId: string;
  isBranchLeaderboard?: boolean;
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwSubmitting, setChangePwSubmitting] = useState(false);
  const [changePwError, setChangePwError] = useState<string | null>(null);
  const [changePwSuccess, setChangePwSuccess] = useState(false);

  const isAdmin = user.role === "ADMIN";
  const rankLine = user.teamName
    ? `RANK: ${user.rankLabel} | ${user.teamName}`
    : `RANK: ${user.rankLabel}`;
  const xpFormatted = user.xp.toLocaleString();

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        <h1 className="font-mono text-lg font-semibold text-foreground">
          {isAdmin ? "MERCHANT NATION COMMAND POST" : "OFFICER PROFILE & RANKS"}
        </h1>
        <Button
          variant="outline"
          size="sm"
          className="font-mono"
          onClick={() => logout()}
        >
          Log out
        </Button>
      </header>

      <div className="flex flex-1 flex-col gap-6 p-4">
        {isAdmin ? (
          <CommandPostProfile name={user.name} />
        ) : (
          <OfficerProfileCard
            user={user}
            rankLine={rankLine}
            xpFormatted={xpFormatted}
          />
        )}

        {/* Operations Overview – command post UI, real data from getProfileStats */}
        <OperationsOverviewSection stats={stats} isAdmin={isAdmin} />

        {/* Change password */}
        <Card className="border-border bg-card text-card-foreground">
          <CardContent className="pt-6">
            {!showChangePassword ? (
              <Button
                variant="outline"
                className="font-mono w-full"
                onClick={() => {
                  setChangePwSuccess(false);
                  setShowChangePassword(true);
                }}
              >
                Change password
              </Button>
            ) : (
              <form
                className="flex flex-col gap-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setChangePwError(null);
                  if (newPassword !== confirmPassword) {
                    setChangePwError("New password and confirmation do not match.");
                    return;
                  }
                  if (newPassword.length < 6) {
                    setChangePwError("New password must be at least 6 characters.");
                    return;
                  }
                  setChangePwSubmitting(true);
                  try {
                    const res = await changePassword(currentPassword, newPassword);
                    if (res.ok) {
                      setChangePwSuccess(true);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setShowChangePassword(false);
                    } else {
                      setChangePwError(res.error ?? "Failed to change password");
                    }
                  } catch (err) {
                    setChangePwError(err instanceof Error ? err.message : "Failed to change password");
                  } finally {
                    setChangePwSubmitting(false);
                  }
                }}
              >
                {changePwSuccess && (
                  <p className="text-sm text-green-600">Password updated.</p>
                )}
                {changePwError && (
                  <p className="text-sm text-destructive">{changePwError}</p>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="profile-current-pw">Current password</Label>
                  <Input
                    id="profile-current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="font-mono"
                    autoComplete="current-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-new-pw">New password</Label>
                  <Input
                    id="profile-new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="font-mono"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="profile-confirm-pw">Confirm new password</Label>
                  <Input
                    id="profile-confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="font-mono"
                    autoComplete="new-password"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={changePwSubmitting} className="font-mono">
                    {changePwSubmitting ? "Updating…" : "Update password"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowChangePassword(false);
                      setChangePwError(null);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard: real DB data, filtered by branch for non-admin; hidden for admin */}
        {!isAdmin && (
        <section>
          <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
            {isBranchLeaderboard
              ? "BRANCH LEADERBOARD"
              : "GLOBAL LEADERBOARD"}
          </h2>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 border-b border-border bg-muted/80 px-3 py-2 font-mono text-xs font-medium text-muted-foreground">
              <span>Rank</span>
              <span>Name</span>
              <span>Zones</span>
              <span className="text-right">XP</span>
            </div>
            {leaderboard.length === 0 ? (
              <p className="px-3 py-4 font-mono text-sm text-muted-foreground">
                No operatives in this ranking yet.
              </p>
            ) : (
              leaderboard.map((u, i) => (
                <div
                  key={u.id}
                  className={cn(
                    "grid grid-cols-[3rem_1fr_4rem_5rem] gap-2 px-3 py-3 font-mono text-sm",
                    u.id === currentUserId
                      ? "border-l-2 border-primary bg-card text-foreground"
                      : "border-border/50 bg-card/50 text-foreground"
                  )}
                >
                  <span className="text-muted-foreground">#{i + 1}</span>
                  <span className="truncate">
                    {u.name}
                    {u.id === currentUserId && (
                      <span className="ml-1 text-primary">(you)</span>
                    )}
                  </span>
                  <span>{u.zones}</span>
                  <span className="text-right font-medium text-primary">
                    {u.xp.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
        )}
      </div>
    </div>
  );
}

/** Officer profile card (rank + XP) for non-admin users */
function OfficerProfileCard({
  user,
  rankLine,
  xpFormatted,
}: {
  user: { name: string; progressFraction: number };
  rankLine: string;
  xpFormatted: string;
}) {
  return (
    <Card className="border-border bg-card text-card-foreground">
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-2xl text-muted-foreground"
          aria-hidden
        >
          {user.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="text-center">
          <p className="font-mono text-xl font-semibold text-primary">
            {user.name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{rankLine}</p>
        </div>
        <div className="w-full space-y-2">
          <div className="flex justify-between font-mono text-xs text-muted-foreground">
            <span>XP PROGRESS:</span>
            <span className="text-primary">{xpFormatted} XP</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${user.progressFraction * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Command Post identity card for ADMIN – no rank, clearance-style UI (no stats grid; stats in OperationsOverviewSection) */
function CommandPostProfile({ name }: { name: string }) {
  return (
    <Card className="overflow-hidden border-primary/30 bg-card text-card-foreground">
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary/80 uppercase">
          Merchant Nation HQ
        </p>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Secure command interface
        </p>
      </div>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/10 font-mono text-2xl font-bold text-primary">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold text-foreground">
              {name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              COMMANDER · Full system access
            </p>
            <span className="mt-2 inline-block rounded border border-primary/50 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              Clearance: FULL
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Operations Overview – command post style section with real DB stats */
function OperationsOverviewSection({
  stats,
  isAdmin,
}: {
  stats: {
    zonesScouted: number;
    merchantsInducted: number;
    zonesCaptured: number;
    missionsCompleted?: number;
  };
  isAdmin: boolean;
}) {
  const tasksLabel = isAdmin ? "TASKS APPROVED" : "MISSIONS COMPLETE";
  const tasksValue = stats.missionsCompleted ?? 0;

  const items = [
    {
      label: "CELLS SCOUTED",
      value: stats.zonesScouted,
      icon: MapPin,
      desc: "Territory cells marked scouted",
    },
    {
      label: "ZONES CAPTURED",
      value: stats.zonesCaptured,
      icon: Target,
      desc: "Zones secured (status captured)",
    },
    {
      label: "MERCHANTS INDUCTED",
      value: stats.merchantsInducted,
      icon: Users,
      desc: "Onboarded in network",
    },
    {
      label: tasksLabel,
      value: tasksValue,
      icon: CheckSquare,
      desc: isAdmin ? "Mission tasks approved" : "Tasks approved (completed)",
    },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-lg border-2 border-primary/30 bg-black/40">
      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(var(--primary) 1px, transparent 1px),
            linear-gradient(90deg, var(--primary) 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />
      {/* Corner brackets */}
      <div className="pointer-events-none absolute left-2 top-2 h-6 w-6 border-l-2 border-t-2 border-primary/50" />
      <div className="pointer-events-none absolute right-2 top-2 h-6 w-6 border-r-2 border-t-2 border-primary/50" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-6 w-6 border-b-2 border-l-2 border-primary/50" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-6 w-6 border-b-2 border-r-2 border-primary/50" />

      <div className="relative border-b border-primary/20 bg-primary/5 px-4 py-2.5">
        <p className="font-mono text-[10px] tracking-[0.25em] text-primary uppercase">
          Operations overview
        </p>
        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
          {isAdmin ? "All branches · Live data" : "Your branch · Live data"}
        </p>
      </div>

      <div className="relative grid grid-cols-1 gap-0 sm:grid-cols-2">
        {items.map(({ label, value, icon: Icon, desc }) => (
          <div
            key={label}
            className={cn(
              "flex flex-col gap-1 border-b border-border p-4 last:border-b-0 sm:border-r sm:even:border-r-0"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {label}
              </span>
              <Icon className="size-4 shrink-0 text-primary/70" aria-hidden />
            </div>
            <p className="font-mono text-2xl font-bold tabular-nums text-primary">
              {value.toLocaleString()}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
