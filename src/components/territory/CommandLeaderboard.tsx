"use client";

import Link from "next/link";
import { ChevronRight, Crown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_PREFIX: Record<string, string> = {
  CADET: "Cdt.",
  OFFICER: "Off.",
  CAPTAIN: "Cpt.",
};

const RANK_PILL_CLASS: Record<string, string> = {
  CADET: "bg-blue-600 text-white",
  OFFICER: "bg-green-600 text-white",
  CAPTAIN: "bg-orange-500 text-white",
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  rank: string;
  xp: number;
  zones: number;
  rankLabel: string;
  /** Simulated rank change for UI: positive = up, negative = down, 0 = no change */
  rankChange?: number;
};

function RankIcon({ position }: { position: number }) {
  if (position === 1) {
    return <Crown className="size-6 text-amber-400" aria-hidden />;
  }
  if (position === 2) {
    return (
      <div className="flex size-8 items-center justify-center rounded-md bg-slate-400/30">
        <span className="font-mono text-sm font-bold text-slate-300">2</span>
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="flex size-8 items-center justify-center rounded-md bg-amber-700/50">
        <span className="font-mono text-sm font-bold text-amber-200">3</span>
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-md bg-muted">
      <span className="font-mono text-sm font-bold text-muted-foreground">{position}</span>
    </div>
  );
}

function RankChangeIcon({ change }: { change: number }) {
  if (change > 0) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-xs text-green-500">
        <TrendingUp className="size-3.5" />+{change}
      </span>
    );
  }
  if (change < 0) {
    return (
      <span className="flex items-center gap-0.5 font-mono text-xs text-red-500">
        <TrendingDown className="size-3.5" />{change}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground">
      <Minus className="size-4" />
    </span>
  );
}

export function CommandLeaderboard({
  title = "Command Leaderboard",
  subtitle = "WEEKLY RANKING",
  districtName = "BOLE DISTRICT",
  entries,
  currentUserId,
  currentUserPosition,
  currentUserEntry,
  xpToNextRank,
  nextRankLabel,
  fullRankingsHref = "/profile",
}: {
  title?: string;
  subtitle?: string;
  districtName?: string;
  entries: LeaderboardEntry[];
  currentUserId: string;
  currentUserPosition: number | null;
  currentUserEntry: LeaderboardEntry | null;
  xpToNextRank: number | null;
  nextRankLabel: string | null;
  fullRankingsHref?: string;
}) {
  const displayName = (name: string, rank: string) => {
    const prefix = RANK_PREFIX[rank] ?? "";
    const short = name.split(/\s+/)[0] ?? name;
    return prefix ? `${prefix} ${short}` : short;
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-mono text-base font-bold text-foreground">{title}</h3>
          <p className="font-mono text-xs text-muted-foreground">
            {subtitle} • {districtName}
          </p>
        </div>
        <Link
          href={fullRankingsHref}
          className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
        >
          Full Rankings
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {entries.map((entry, index) => {
          const position = index + 1;
          const isCurrentUser = entry.id === currentUserId;
          return (
            <li
              key={entry.id}
              className={cn(
                "flex items-center gap-3 rounded-md px-2 py-1.5",
                isCurrentUser && "bg-primary/10"
              )}
            >
              <RankIcon position={position} />
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-sm font-semibold text-foreground">
                {(entry.name[0] ?? "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-medium text-foreground">
                    {displayName(entry.name, entry.rank)}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase",
                      RANK_PILL_CLASS[entry.rank] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {entry.rankLabel}
                  </span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  {entry.xp.toLocaleString()} XP · {entry.zones} zones
                </p>
              </div>
              <div className="shrink-0">
                <RankChangeIcon change={entry.rankChange ?? 0} />
              </div>
            </li>
          );
        })}
      </ul>

      {currentUserEntry && currentUserPosition != null && currentUserPosition > entries.length && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 font-mono text-xs font-semibold text-muted-foreground">
            Your Position
          </p>
          <div className="flex items-center gap-3 rounded-md bg-muted/50 px-2 py-2">
            <RankIcon position={currentUserPosition} />
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-sm font-semibold text-foreground">
              {(currentUserEntry.name[0] ?? "?").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-mono text-sm font-medium text-foreground">
                {displayName(currentUserEntry.name, currentUserEntry.rank)}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                {currentUserEntry.xp.toLocaleString()} XP
              </p>
            </div>
            {xpToNextRank != null && nextRankLabel && (
              <div className="text-right">
                <p className="font-mono text-[10px] text-muted-foreground">To next rank</p>
                <p className="font-mono text-xs font-semibold text-primary">
                  {xpToNextRank} XP
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentUserEntry && currentUserPosition != null && currentUserPosition <= entries.length && xpToNextRank != null && nextRankLabel && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 font-mono text-xs font-semibold text-muted-foreground">
            Your Position
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-foreground">
              #{currentUserPosition} · {currentUserEntry.xp.toLocaleString()} XP
            </span>
            <span className="font-mono text-xs text-primary">
              To next rank: {xpToNextRank} XP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
