"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Users,
  Target,
  CheckSquare,
  Sparkles,
  Medal,
  Crown,
  LogOut,
  PenLine,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout, changePassword } from "@/app/actions/auth";
import { updateMyDisplayName } from "@/app/actions/users";
import { ContributionHeatmap } from "@/components/gamification/ContributionHeatmap";
import { StreakTracker } from "@/components/gamification/StreakTracker";
import {
  getMyNotificationPreferences,
  updateMyNotificationPreferences,
} from "@/app/actions/notification-preferences";

type UserRow = {
  id: string;
  name: string;
  rank: string;
  xp: number;
  zones: number;
  scouts: number;
  managerName: string;
  latestZoneCode: string;
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
  contribution,
  gamificationData,
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
  contribution: {
    totals: { leads: number; merchants: number };
    activeDays: number;
    mostActive: { date: string; leads: number; merchants: number };
    activity: Array<{ date: string; leads: number; merchants: number }>;
  };
  gamificationData: {
    streak: any;
    achievements: any[];
    scratchCards: any[];
    challenges: any[];
    xp: number;
  };
}) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePwSubmitting, setChangePwSubmitting] = useState(false);
  const [changePwError, setChangePwError] = useState<string | null>(null);
  const [changePwSuccess, setChangePwSuccess] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [displayNameDialogOpen, setDisplayNameDialogOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState(user.name);
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);

  const router = useRouter();

  const openDisplayNameDialog = useCallback(() => {
    setDisplayNameError(null);
    setDisplayNameSuccess(false);
    setDisplayNameInput(user.name);
    setDisplayNameDialogOpen(true);
  }, [user.name]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clearHashFromUrl = () => {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    };
    const openIfHash = () => {
      if (window.location.hash !== "#display-name") return;
      openDisplayNameDialog();
      clearHashFromUrl();
    };
    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    return () => window.removeEventListener("hashchange", openIfHash);
  }, [openDisplayNameDialog]);

  const isAdmin = user.role === "ADMIN";
  const rankLine = user.teamName
    ? `RANK: ${user.rankLabel} | ${user.teamName}`
    : `RANK: ${user.rankLabel}`;
  const xpFormatted = user.xp.toLocaleString();
  const totalScouts = contribution.totals.leads;
  const scoutBadgeCount = Math.floor(totalScouts / 5);
  const nextScoutBadgeAt = (scoutBadgeCount + 1) * 5;
  const recentScoutBadgeAt = scoutBadgeCount > 0 ? scoutBadgeCount * 5 : null;

  return (
    <div className="flex min-h-screen flex-col bg-background pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4">
        <h1 className="min-w-0 truncate font-mono text-lg font-semibold text-foreground">
          {isAdmin ? "MERCHANT NATION COMMAND POST" : "OFFICER PROFILE & RANKS"}
        </h1>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono"
            onClick={openDisplayNameDialog}
            aria-label="Set display name"
          >
            <PenLine className="size-4 sm:mr-1" aria-hidden />
            <span className="hidden sm:inline">Set name</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="font-mono"
            onClick={() => setLogoutDialogOpen(true)}
          >
            Log out
          </Button>
        </div>
      </header>

      {/* Logout confirmation — command-post style */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent
          className="overflow-hidden border-2 border-primary/30 bg-card sm:max-w-md"
          showCloseButton={false}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(var(--primary) 1px, transparent 1px),
                linear-gradient(90deg, var(--primary) 1px, transparent 1px)
              `,
              backgroundSize: "16px 16px",
            }}
          />
          <div className="pointer-events-none absolute left-3 top-3 h-5 w-5 border-l-2 border-t-2 border-primary/40" />
          <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 border-r-2 border-t-2 border-primary/40" />
          <div className="pointer-events-none absolute bottom-3 left-3 h-5 w-5 border-b-2 border-l-2 border-primary/40" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-5 w-5 border-b-2 border-r-2 border-primary/40" />

          <DialogHeader className="relative border-b border-primary/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border-2 border-primary/50 bg-primary/10">
                <LogOut className="size-6 text-primary" aria-hidden />
              </div>
              <div>
                <DialogTitle className="font-mono text-lg tracking-tight text-foreground">
                  Stand down?
                </DialogTitle>
                <DialogDescription className="mt-0.5 font-mono text-xs text-muted-foreground">
                  You are about to leave the command post.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="relative flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
            <Shield
              className="size-4 shrink-0 text-primary/80 mt-0.5"
              aria-hidden
            />
            <p className="font-mono text-xs text-muted-foreground">
              Your session will end. You can sign back in anytime to resume
              operations.
            </p>
          </div>
          <DialogFooter className="relative flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="font-mono"
              onClick={() => setLogoutDialogOpen(false)}
            >
              Stay
            </Button>
            <Button
              className="font-mono"
              onClick={() => {
                setLogoutDialogOpen(false);
                logout();
              }}
            >
              <LogOut className="size-4 mr-2" aria-hidden />
              Log out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={displayNameDialogOpen} onOpenChange={setDisplayNameDialogOpen}>
        <DialogContent className="border-border bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg text-foreground">
              Set display name
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-muted-foreground">
              This name appears on your profile, missions, and leaderboards so
              teammates can tell accounts apart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name-input" className="font-mono text-xs">
              Display name
            </Label>
            <Input
              id="display-name-input"
              value={displayNameInput}
              onChange={(e) => setDisplayNameInput(e.target.value)}
              className="font-mono"
              maxLength={120}
              autoComplete="name"
              disabled={displayNameSaving}
            />
            {displayNameError ? (
              <p className="font-mono text-xs text-destructive">{displayNameError}</p>
            ) : null}
            {displayNameSuccess ? (
              <p className="font-mono text-xs text-green-600 dark:text-green-400">
                Display name updated.
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="font-mono"
              disabled={displayNameSaving}
              onClick={() => setDisplayNameDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="font-mono"
              disabled={displayNameSaving}
              onClick={async () => {
                setDisplayNameError(null);
                setDisplayNameSuccess(false);
                setDisplayNameSaving(true);
                try {
                  const res = await updateMyDisplayName(displayNameInput);
                  if (!res.ok) {
                    setDisplayNameError(res.error);
                    return;
                  }
                  setDisplayNameSuccess(true);
                  router.refresh();
                  setTimeout(() => setDisplayNameDialogOpen(false), 600);
                } finally {
                  setDisplayNameSaving(false);
                }
              }}
            >
              {displayNameSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

        <Card
          id="display-name-settings"
          className="border-border bg-card text-card-foreground"
        >
          <CardContent className="pt-6">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Display name
            </p>
            <p className="mt-1 font-mono text-sm text-foreground">{user.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use a unique name so managers and teammates can identify you in
              rankings and reports.
            </p>
            <Button
              variant="outline"
              className="mt-4 font-mono w-full sm:w-auto"
              type="button"
              onClick={openDisplayNameDialog}
            >
              <PenLine className="mr-2 size-4" aria-hidden />
              Change display name
            </Button>
          </CardContent>
        </Card>

        {!isAdmin && (
          <ScoutBadgeProgress
            totalScouts={contribution.totals.leads}
            unlockedCodes={
              new Set(gamificationData.achievements.map((a) => a.code))
            }
          />
        )}

        {!isAdmin && <ConnectPhoneNotificationsCard userId={user.id} />}

        {/* Operations Overview – command post UI, real data from getProfileStats */}
        <OperationsOverviewSection stats={stats} isAdmin={isAdmin} />

        {/* Streak Tracker - NEW! */}
        <StreakTracker
          streak={gamificationData.streak}
          enableDailyGlow={user.role === "PLAYER"}
        />

        <section className="grid gap-3 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Scouts Summary
              </p>
              <p className="mt-2 font-mono text-4xl font-bold text-foreground">
                {contribution.totals.leads}
              </p>
              <p className="text-sm text-muted-foreground">
                Total scout places submitted in the last 365 days
              </p>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="pt-6">
              <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Badges
              </p>
              <p className="mt-2 font-mono text-4xl font-bold text-foreground">
                {scoutBadgeCount}
              </p>
              <div className="mt-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="mb-3 flex items-center justify-center">
                  <ScoutBadgeEmblem level={Math.max(1, scoutBadgeCount)} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Most recent badge:{" "}
                  {recentScoutBadgeAt
                    ? `Scout ${recentScoutBadgeAt} Badge`
                    : "No badge yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Badge rule: every 5 scouts gives +1 badge (5 = badge 1, 10 = badge 2).
                </p>
                <p className="mt-1 text-xs font-mono text-primary">
                  Progress: {totalScouts}/{nextScoutBadgeAt}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <ContributionHeatmap
          activity={contribution.activity}
          totalLeads={contribution.totals.leads}
          totalMerchants={contribution.totals.merchants}
          activeDays={contribution.activeDays}
          mostActive={contribution.mostActive}
          currentStreak={gamificationData.streak?.currentStreak ?? 0}
          maxStreak={gamificationData.streak?.longestStreak ?? 0}
        />

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
                    setChangePwError(
                      "New password and confirmation do not match.",
                    );
                    return;
                  }
                  if (newPassword.length < 6) {
                    setChangePwError(
                      "New password must be at least 6 characters.",
                    );
                    return;
                  }
                  setChangePwSubmitting(true);
                  try {
                    const res = await changePassword(
                      currentPassword,
                      newPassword,
                    );
                    if (res.ok) {
                      setChangePwSuccess(true);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setShowChangePassword(false);
                    } else {
                      setChangePwError(
                        res.error ?? "Failed to change password",
                      );
                    }
                  } catch (err) {
                    setChangePwError(
                      err instanceof Error
                        ? err.message
                        : "Failed to change password",
                    );
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
                  <Label htmlFor="profile-confirm-pw">
                    Confirm new password
                  </Label>
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
                  <Button
                    type="submit"
                    disabled={changePwSubmitting}
                    className="font-mono"
                  >
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

        {/* Global performance chart visible to all players */}
        {!isAdmin && (
          <section>
            <h2 className="mb-3 font-mono text-base font-semibold text-foreground">
              GLOBAL PERFORMANCE CHART
            </h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {[leaderboard[0], leaderboard[1], leaderboard[2]].map((u, i) => (
                <div
                  key={u?.id ?? `empty-${i}`}
                  className={cn(
                    "rounded-lg border p-3",
                    i === 0 && "border-yellow-500/50 bg-yellow-500/10",
                    i === 1 && "border-slate-400/40 bg-slate-400/10",
                    i === 2 && "border-amber-700/40 bg-amber-700/10",
                    !u && "border-border bg-muted/20",
                  )}
                >
                  <p className="font-mono text-xs text-muted-foreground">
                    {i === 0
                      ? "1st Place"
                      : i === 1
                        ? "2nd Place"
                        : "3rd Place"}
                  </p>
                  <p className="truncate font-mono text-sm font-semibold text-foreground">
                    {u?.name ?? "—"}
                  </p>
                  <p className="font-mono text-xs text-primary">
                    {u ? `${u.xp.toLocaleString()} XP` : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <div className="grid grid-cols-[3rem_1fr_6rem_8rem_7rem_5rem] gap-2 border-b border-border bg-muted/80 px-3 py-2 font-mono text-xs font-medium text-muted-foreground">
                <span>#</span>
                <span>Player</span>
                <span>Scouts</span>
                <span>Manager</span>
                <span>Zone</span>
                <span className="text-right">Performance</span>
              </div>
              {leaderboard.length === 0 ? (
                <p className="px-3 py-4 font-mono text-sm text-muted-foreground">
                  No players in ranking yet.
                </p>
              ) : (
                leaderboard.map((u, i) => (
                  <div
                    key={u.id}
                    className={cn(
                      "grid grid-cols-[3rem_1fr_6rem_8rem_7rem_5rem] gap-2 px-3 py-3 font-mono text-sm",
                      u.id === currentUserId
                        ? "border-l-2 border-primary bg-card text-foreground"
                        : "border-border/50 bg-card/50 text-foreground",
                    )}
                  >
                    <span className="text-muted-foreground">#{i + 1}</span>
                    <span className="truncate">
                      {u.name}
                      {u.id === currentUserId && (
                        <span className="ml-1 text-primary">(you)</span>
                      )}
                    </span>
                    <span>{u.scouts}</span>
                    <span className="truncate text-muted-foreground">
                      {u.managerName}
                    </span>
                    <span className="truncate">{u.latestZoneCode}</span>
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

function ScoutBadgeEmblem({ level }: { level: number }) {
  const tier = level % 3;
  const palette =
    tier === 1
      ? {
          outer: "from-slate-300 to-slate-500",
          inner: "from-slate-100 to-slate-300",
          glow: "shadow-slate-500/30",
        }
      : tier === 2
        ? {
            outer: "from-amber-300 to-orange-500",
            inner: "from-yellow-100 to-amber-300",
            glow: "shadow-orange-500/35",
          }
        : {
            outer: "from-cyan-300 to-blue-500",
            inner: "from-indigo-100 to-cyan-300",
            glow: "shadow-blue-500/35",
          };

  return (
    <div className={`relative rounded-xl p-1 shadow-lg ${palette.glow}`}>
      <svg
        width="110"
        height="110"
        viewBox="0 0 110 110"
        role="img"
        aria-label={`Scout badge level ${level}`}
      >
        <defs>
          <linearGradient id="badgeOuter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
        <polygon
          points="55,6 93,28 93,72 55,104 17,72 17,28"
          className={`fill-none stroke-2 drop-shadow-sm ${tier === 1 ? "stroke-slate-400" : tier === 2 ? "stroke-orange-400" : "stroke-cyan-400"}`}
        />
        <circle
          cx="55"
          cy="55"
          r="27"
          className={`stroke-2 ${tier === 1 ? "fill-slate-200/80 stroke-slate-500" : tier === 2 ? "fill-amber-200/80 stroke-orange-500" : "fill-cyan-200/80 stroke-blue-500"}`}
        />
        <text
          x="55"
          y="52"
          textAnchor="middle"
          className="fill-zinc-900 text-[12px] font-bold"
        >
          SCOUT
        </text>
        <text
          x="55"
          y="67"
          textAnchor="middle"
          className="fill-zinc-900 text-[14px] font-extrabold"
        >
          {level}
        </text>
      </svg>
      <div
        className={`pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br ${palette.outer} opacity-20`}
      />
      <div
        className={`pointer-events-none absolute inset-2 rounded-lg bg-gradient-to-br ${palette.inner} opacity-20`}
      />
    </div>
  );
}

function ConnectPhoneNotificationsCard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [savingPush, setSavingPush] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const telegramBotLink = useMemo(() => {
    const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    return username ? `https://t.me/${username}?start=u_${userId}` : null;
  }, [userId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const pref = await getMyNotificationPreferences();
        if (!active) return;
        setTelegramEnabled(Boolean(pref.channels.TELEGRAM?.enabled));
        setTelegramChatId(pref.channels.TELEGRAM?.telegramChatId ?? "");
        setPushEnabled(Boolean(pref.channels.WEB_PUSH?.enabled));
        setWhatsAppEnabled(Boolean(pref.channels.WHATSAPP?.enabled));
        setWhatsAppPhone(pref.channels.WHATSAPP?.whatsappPhone ?? "");
      } catch {
        if (active) setStatus("Could not load notification settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleEnablePush() {
    setStatus(null);
    setSavingPush(true);
    try {
      if (!("Notification" in window)) {
        setStatus("This browser does not support notifications.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("Notification permission was not granted.");
        return;
      }

      let endpoint = "";
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        const subscription =
          existing ??
          (vapidKey
            ? await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: vapidKey,
              })
            : null);
        endpoint = subscription?.endpoint ?? "";
      } catch {
        // Keep channel enabled even if endpoint capture fails.
      }

      await updateMyNotificationPreferences({
        channels: { WEB_PUSH: { enabled: true } },
        ...(endpoint ? { webPushEndpoint: endpoint } : {}),
      });
      setPushEnabled(true);
      setStatus("Push notifications enabled.");
    } catch {
      setStatus("Failed to enable push notifications.");
    } finally {
      setSavingPush(false);
    }
  }

  async function handleSaveWhatsApp() {
    setStatus(null);
    setSavingWhatsApp(true);
    try {
      const normalized = whatsAppPhone.trim();
      if (!normalized) {
        setStatus("Enter WhatsApp phone number first.");
        return;
      }
      await updateMyNotificationPreferences({
        channels: { WHATSAPP: { enabled: true } },
        whatsappPhone: normalized,
      });
      setWhatsAppEnabled(true);
      setStatus("WhatsApp number saved and enabled.");
    } catch {
      setStatus("Failed to save WhatsApp number.");
    } finally {
      setSavingWhatsApp(false);
    }
  }

  async function handleConnectTelegram() {
    setStatus(null);
    try {
      if (telegramBotLink) {
        window.open(telegramBotLink, "_blank", "noopener,noreferrer");
        setStatus("Opened Telegram bot. Press Start to finish linking.");
      } else {
        setStatus(
          "Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME to enable Telegram deep-link.",
        );
      }
    } catch {
      setStatus("Failed to open Telegram link.");
    }
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardContent className="pt-5">
        <div className="mb-4">
          <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Connect Your Phone Notifications
          </p>
          <p className="font-mono text-sm text-foreground">
            Stay focused with progress reminders on your phone.
          </p>
        </div>

        {loading ? (
          <p className="font-mono text-sm text-muted-foreground">
            Loading phone notification settings...
          </p>
        ) : (
          <div className="grid gap-3">
            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm font-semibold text-foreground">
                  Enable Push
                </p>
                <span
                  className={cn(
                    "font-mono text-xs",
                    pushEnabled ? "text-green-500" : "text-amber-500",
                  )}
                >
                  {pushEnabled ? "Connected" : "Not connected"}
                </span>
              </div>
              <Button
                onClick={handleEnablePush}
                disabled={savingPush}
                className="font-mono"
                size="sm"
              >
                {savingPush ? "Enabling..." : "Enable Push"}
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm font-semibold text-foreground">
                  Connect Telegram
                </p>
                <span
                  className={cn(
                    "font-mono text-xs",
                    telegramChatId ? "text-green-500" : "text-amber-500",
                  )}
                >
                  {telegramChatId ? "Connected" : "Not connected"}
                </span>
              </div>
              <Button
                onClick={handleConnectTelegram}
                className="font-mono"
                size="sm"
              >
                {telegramChatId ? "Reconnect Telegram" : "Connect Telegram"}
              </Button>
              {telegramChatId ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Linked chat ID: <span className="text-foreground">{telegramChatId}</span>
                </p>
              ) : telegramEnabled ? (
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Telegram is enabled but not linked. Press Start in the bot to complete linking.
                </p>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm font-semibold text-foreground">
                  Add WhatsApp Number
                </p>
                <span
                  className={cn(
                    "font-mono text-xs",
                    whatsAppEnabled ? "text-green-500" : "text-amber-500",
                  )}
                >
                  {whatsAppEnabled ? "Connected" : "Not connected"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={whatsAppPhone}
                  onChange={(e) => setWhatsAppPhone(e.target.value)}
                  placeholder="+2519XXXXXXXX"
                  className="font-mono"
                />
                <Button
                  onClick={handleSaveWhatsApp}
                  disabled={savingWhatsApp}
                  className="font-mono"
                >
                  {savingWhatsApp ? "Saving..." : "Save Number"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {status && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            {status}
          </p>
        )}
      </CardContent>
    </Card>
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
  const getIcon = (index: number) =>
    STAGE_ICONS[Math.min(index, STAGE_ICONS.length - 1)] ?? Crown;

  const currentIndex = rankStages.findIndex((s) => s.id === user.rank);
  const nextStage =
    currentIndex >= 0 && currentIndex < rankStages.length - 1
      ? rankStages[currentIndex + 1]!
      : null;
  const isCurrent = (id: string) => id === user.rank;
  const isPast = (index: number) => index < currentIndex;
  const isNext = (id: string) => nextStage?.id === id;

  if (rankStages.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="overflow-hidden border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 pt-5 pb-4">
            <p className="font-mono text-lg font-semibold text-foreground">
              {user.name}
            </p>
            <p className="text-sm text-muted-foreground">
              No ranks configured. Ask an admin to set up officer ranks.
            </p>
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
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          aria-hidden
        />
        <CardContent className="flex flex-col items-center gap-3 pt-5 pb-4">
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-primary/15 to-primary/5 font-mono text-xl font-bold text-primary shadow-inner ring-2 ring-primary/25 ring-offset-2 ring-offset-card"
            aria-hidden
          >
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="text-center">
            <p className="font-mono text-lg font-semibold tracking-tight text-foreground">
              {user.name}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{rankLine}</p>
          </div>
        </CardContent>
      </Card>

      {/* Rank progression: track line + icons in a row */}
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <CardContent className="relative px-4 py-5">
          {/* Background track (full width between first and last node) */}
          <div
            className="absolute left-[16%] right-[16%] top-[2.125rem] h-0.5 bg-muted/80"
            aria-hidden
          />
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
                <div
                  key={stage.id}
                  className="flex flex-1 flex-col items-center"
                >
                  <div
                    className={cn(
                      "relative z-10 flex size-12 items-center justify-center rounded-full transition-all duration-300",
                      current &&
                        "bg-primary text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/20 scale-110",
                      past &&
                        "bg-green-500 text-white shadow-md ring-2 ring-green-400/50",
                      !current &&
                        !past &&
                        "bg-muted/90 text-muted-foreground ring-2 ring-border/80",
                    )}
                  >
                    {past ? (
                      <span
                        className="text-xl font-bold leading-none"
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : (
                      <Icon
                        className="size-6 shrink-0"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                    )}
                  </div>
                  <div className="mt-2 flex flex-col items-center gap-0.5">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {stage.tier}
                    </span>
                    <span
                      className={cn(
                        "font-mono text-sm font-semibold",
                        current ? "text-primary" : "text-foreground/90",
                      )}
                    >
                      {stage.shortLabel}
                    </span>
                    <span
                      className="font-mono text-[10px] text-muted-foreground"
                      title={stage.xpRange}
                    >
                      {stage.xpRange}
                    </span>
                    {current && (
                      <span className="mt-1 rounded-full bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        You are here
                      </span>
                    )}
                    {next && (
                      <span className="mt-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        Next goal
                      </span>
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
                <span className="font-mono text-xs font-medium text-muted-foreground">
                  Progress to {user.nextRankLabel}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums text-primary">
                  {user.xpToNextRank} XP to go
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/80 transition-[width] duration-700 ease-out"
                    style={{
                      width: `${Math.round(user.progressFraction * 100)}%`,
                    }}
                  />
                </div>
                <span className="min-w-[2.5rem] font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {Math.round(user.progressFraction * 100)}%
                </span>
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
                {xpFormatted} XP total
              </p>
            </div>
          ) : (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-3">
              <Crown className="size-4 text-primary" aria-hidden />
              <p className="font-mono text-xs font-semibold text-primary">
                Max rank reached · {xpFormatted} XP
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoutBadgeProgress({
  totalScouts,
  unlockedCodes,
}: {
  totalScouts: number;
  unlockedCodes: Set<string>;
}) {
  const milestones = [
    { code: "STREAK_7", label: "Scout Cadet", target: 7 },
    { code: "STREAK_14", label: "Scout Officer", target: 14 },
  ];
  const next = milestones.find((m) => totalScouts < m.target) ?? null;

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardContent className="pt-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Scout Badge Progress
            </p>
            <p className="font-mono text-sm font-semibold text-foreground">
              {totalScouts} scouted places total
            </p>
          </div>
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">
            {next
              ? `${Math.max(0, next.target - totalScouts)} to go`
              : "All unlocked"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {milestones.map((m) => {
            const unlocked =
              unlockedCodes.has(m.code) || totalScouts >= m.target;
            return (
              <div
                key={m.code}
                className={cn(
                  "rounded-lg border p-3",
                  unlocked
                    ? "border-green-500/40 bg-green-500/10"
                    : "border-border bg-muted/30",
                )}
              >
                <p className="font-mono text-xs text-muted-foreground">
                  Target: {m.target} scouts
                </p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {m.label}
                </p>
                <p
                  className={cn(
                    "mt-1 font-mono text-xs",
                    unlocked ? "text-green-400" : "text-amber-400",
                  )}
                >
                  {unlocked
                    ? "Unlocked"
                    : `${m.target - totalScouts} remaining`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
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
            <p className="font-mono text-lg font-semibold text-foreground">
              {name}
            </p>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Commander · Full system access
            </p>
            <span className="mt-2 inline-block rounded border border-primary/50 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-primary">
              Clearance: FULL
            </span>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Officer ranks (Cadet → Officer → Captain) do not apply to admin
              accounts.
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
              "flex flex-col gap-1 border-b border-border p-4 last:border-b-0 sm:border-r sm:even:border-r-0",
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
