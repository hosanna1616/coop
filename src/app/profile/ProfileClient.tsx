"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Users, Target, CheckSquare, Sparkles, Medal, Crown } from "lucide-react";
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

export type RankStage = {
  id: string;
  shortLabel: string;
  tier: string;
  xpRange: string;
};

export function ProfileClient({
  user,
  rankStages,
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
    xpToNextRank: number | null;
    nextRankLabel: string | null;
  };
  rankStages: RankStage[];
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
            rankStages={rankStages}
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

/** Officer profile card: compact identity + horizontal rank progression with icons. */
function OfficerProfileCard({
  user,
  rankStages,
  rankLine,
  xpFormatted,
}: {
  user: {
    name: string;
    rank: string;
    rankLabel: string;
    xp: number;
    progressFraction: number;
    xpToNextRank: number | null;
    nextRankLabel: string | null;
  };
  rankStages: RankStage[];
  rankLine: string;
  xpFormatted: string;
}) {
  const STAGE_ICONS = [Sparkles, Medal, Crown] as const;
  const getIcon = (index: number) => STAGE_ICONS[Math.min(index, STAGE_ICONS.length - 1)] ?? Crown;

  const currentIndex = rankStages.findIndex((s) => s.id === user.rank);
  const nextStage = currentIndex >= 0 && currentIndex < rankStages.length - 1 ? rankStages[currentIndex + 1]! : null;
  const isCurrent = (id: string) => id === user.rank;
  const isPast = (index: number) => index < currentIndex;
  const isNext = (id: string) => nextStage?.id === id;

  if (rankStages.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 pt-5 pb-4">
            <p className="font-mono text-lg font-semibold text-foreground">{user.name}</p>
            <p className="text-sm text-muted-foreground">No ranks configured. Ask an admin to set up officer ranks.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Track spans between first and last node; N nodes => (N-1) segments.
  const segmentCount = Math.max(1, rankStages.length - 1);
  const segmentWidth = 68 / segmentCount;
  const filledWidth =
    currentIndex < 0
      ? 0
      : currentIndex >= rankStages.length - 1
        ? 68
        : segmentWidth * currentIndex + segmentWidth * user.progressFraction;

  return (
    <div className="space-y-4">
      {/* Identity card with subtle gradient accent */}
      <Card className="relative overflow-hidden border-border bg-card shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" aria-hidden />
        <CardContent className="flex flex-col items-center gap-3 pt-5 pb-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 font-mono text-xl font-bold text-primary shadow-inner ring-2 ring-primary/25 ring-offset-2 ring-offset-card"
            aria-hidden
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tracking-tight text-foreground">{user.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{rankLine}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rank progression: track line + icons in a row */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="relative px-4 py-5">
          {/* Background track (full width between first and last node) */}
          <div className="absolute left-[16%] right-[16%] top-[2.125rem] h-0.5 bg-muted/80" aria-hidden />
          {/* Filled track: only up to current node + progress within current segment */}
          <div
            className="absolute top-[2.125rem] h-0.5 rounded-full bg-gradient-to-r from-green-500 to-primary transition-all duration-700"
            style={{
              left: "16%",
              width: `${filledWidth}%`,
            }}
            aria-hidden
          />

          <div className="relative flex items-start justify-between">
            {rankStages.map((stage, index) => {
              const Icon = getIcon(index);
              const past = isPast(index);
              const current = isCurrent(stage.id);
              const next = isNext(stage.id);
              return (
                <div key={stage.id} className="flex flex-1 flex-col items-center">
                  <div
                    className={cn(
                      "relative z-10 flex size-12 items-center justify-center rounded-full transition-all duration-300",
                      current && "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/20 scale-110",
                      past && "bg-green-500 text-white shadow-md ring-2 ring-green-400/50",
                      !current && !past && "bg-muted/90 text-muted-foreground ring-2 ring-border/80"
                    )}
                  >
                    {past ? (
                      <span className="text-xl font-bold leading-none" aria-hidden>✓</span>
                    ) : (
                      <Icon className="size-6 shrink-0" strokeWidth={2.5} aria-hidden />
                    )}
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-0.5">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{stage.tier}</span>
                    <span className={cn("font-mono text-sm font-semibold", current ? "text-primary" : "text-foreground/90")}>
                      {stage.shortLabel}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground" title={stage.xpRange}>{stage.xpRange}</span>
                    {current && (
                      <span className="mt-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">You are here</span>
                    )}
                    {next && (
                      <span className="mt-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">Next goal</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress to next rank */}
          {user.xpToNextRank != null && user.nextRankLabel ? (
            <div className="mt-4 rounded-xl border border-border/60 bg-gradient-to-br from-muted/40 to-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium text-muted-foreground">Progress to {user.nextRankLabel}</span>
                <span className="font-mono text-xs font-bold tabular-nums text-primary">{user.xpToNextRank} XP to go</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-[width] duration-700 ease-out"
                    style={{ width: `${Math.round(user.progressFraction * 100)}%` }}
                  />
                </div>
                <span className="min-w-[2.5rem] font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">{Math.round(user.progressFraction * 100)}%</span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{xpFormatted} XP total</p>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-3">
              <Crown className="size-4 text-primary" aria-hidden />
              <p className="font-mono text-xs font-semibold text-primary">Max rank reached · {xpFormatted} XP</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Command Post identity card for ADMIN – no rank, clearance-style UI */
function CommandPostProfile({ name }: { name: string }) {
  return (
    <Card className="overflow-hidden border-primary/30 bg-card text-card-foreground">
      <div className="border-b border-primary/20 bg-primary/5 px-4 py-2">
        <p className="font-mono text-[10px] tracking-[0.2em] text-primary/80 uppercase">
          Merchant Nation HQ
        </p>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Secure command interface · No ranking
        </p>
      </div>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/10 font-mono text-2xl font-bold text-primary">
            {name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-lg font-semibold text-foreground">{name}</p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Commander · Full system access
            </p>
            <span className="mt-2 inline-block rounded border border-primary/50 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              Clearance: FULL
            </span>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Officer ranks (Cadet → Officer → Captain) do not apply to admin accounts.
            </p>
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
