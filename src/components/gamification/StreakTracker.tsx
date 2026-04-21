"use client";

import { Flame, Shield, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type StreakData = {
  currentStreak: number;
  longestStreak: number;
  lastActionDate: string;
  lastActiveAt?: string | null;
  freezeShields: number;
};

type StreakTrackerProps = {
  streak: StreakData | null;
  enableDailyGlow?: boolean;
};

const MILESTONES = [7, 14, 21, 30, 50, 100, 365];

export function StreakTracker({ streak, enableDailyGlow = false }: StreakTrackerProps) {
  if (!streak) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="h-8 w-8 text-orange-400" />
          <h3 className="font-mono text-lg font-bold text-foreground">
            Streak Tracker
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No streak yet. Start your activity today!
        </p>
      </div>
    );
  }

  const nextMilestone = MILESTONES.find((m) => m > streak.currentStreak);
  const progressToNext = nextMilestone
    ? ((streak.currentStreak %
        (nextMilestone - MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] ||
          0)) /
        (nextMilestone -
          (MILESTONES[MILESTONES.indexOf(nextMilestone) - 1] || 0))) *
      100
    : 100;

  const getLastActionText = () => {
    const last = streak.lastActiveAt
      ? new Date(streak.lastActiveAt)
      : new Date(streak.lastActionDate);
    if (Number.isNaN(last.getTime())) return "Unknown";
    return `${last.toLocaleDateString()} ${last.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  const isActiveToday = useMemo(() => {
    const source = streak.lastActiveAt ?? streak.lastActionDate;
    const d = new Date(source);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }, [streak.lastActiveAt, streak.lastActionDate]);

  const [glowActive, setGlowActive] = useState(false);
  useEffect(() => {
    if (!(enableDailyGlow && isActiveToday)) {
      setGlowActive(false);
      return;
    }
    setGlowActive(true);
    const t = setTimeout(() => setGlowActive(false), 30000);
    return () => clearTimeout(t);
  }, [enableDailyGlow, isActiveToday, streak.currentStreak, streak.lastActionDate, streak.lastActiveAt]);

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-orange-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-6 text-zinc-100 transition-all duration-[30000ms] ease-out"
      style={{
        boxShadow: glowActive
          ? "0 0 36px rgba(245, 158, 11, 0.7), 0 0 80px rgba(234, 88, 12, 0.35)"
          : "0 0 18px rgba(249, 115, 22, 0.16)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:12px_12px]" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-orange-500/20 blur-2xl" />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Flame className="h-10 w-10 animate-pulse text-orange-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.9)]" />
            {streak.currentStreak >= 7 && (
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-yellow-300 animate-ping" />
            )}
          </div>
          <div>
            <h3 className="font-mono text-2xl font-bold text-orange-200">
              {streak.currentStreak}-Day Streak!
            </h3>
            <p className="text-sm text-zinc-300">Last active: {getLastActionText()}</p>
          </div>
        </div>

        {streak.freezeShields > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2">
            <Shield className="h-5 w-5 text-cyan-300" />
            <span className="text-sm font-semibold text-cyan-200">
              {streak.freezeShields} Shield{streak.freezeShields > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {nextMilestone && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-300">
              Next milestone: {nextMilestone} days
            </span>
            <span className="text-sm font-bold text-orange-300">
              {nextMilestone - streak.currentStreak} days to go
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-zinc-700">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 shadow-[0_0_12px_rgba(249,115,22,0.6)] transition-all duration-500"
              style={{ width: `${Math.min(progressToNext, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-sm text-zinc-300">Personal Best</span>
          </div>
          <div className="text-2xl font-bold text-zinc-100">
            {streak.longestStreak} days
          </div>
        </div>

        <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-5 w-5 text-orange-400" />
            <span className="text-sm text-zinc-300">Current Streak</span>
          </div>
          <div className="text-2xl font-bold text-orange-200">
            {streak.currentStreak} days
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800/80 p-4">
        <h4 className="mb-3 text-sm font-semibold text-zinc-200">Milestones</h4>
        <div className="flex flex-wrap gap-2">
          {MILESTONES.map((milestone) => {
            const achieved = streak.currentStreak >= milestone;
            return (
              <div
                key={milestone}
                className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                  achieved
                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                    : "bg-zinc-700 text-zinc-300"
                }`}
              >
                {achieved ? "✓" : "○"} {milestone} days
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
       
      </div>
      <p className="mt-3 text-center font-mono text-sm text-orange-200">
        See you tomorrow, keep the chain alive 🔥
      </p>
    </div>
  );
}
