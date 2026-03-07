"use client";

import { MapPin, Users, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_PILL_CLASS: Record<string, string> = {
  CADET: "bg-blue-600 text-white",
  OFFICER: "bg-green-600 text-white",
  CAPTAIN: "bg-orange-500 text-white",
};

const RANK_PREFIX: Record<string, string> = {
  CADET: "Cdt.",
  OFFICER: "Off.",
  CAPTAIN: "Cpt.",
};

export type OfficerProfileProps = {
  name: string;
  rank: string;
  rankLabel: string;
  /** Optional tier from ranks config (e.g. R1, R2, R3). */
  rankTier?: string;
  territoryLabel?: string;
  districtName?: string;
  xp: number;
  xpNextRank: number | null;
  nextRankLabel: string | null;
  progressFraction: number;
  zonesCaptured: number;
  merchantsInducted: number;
  floatSecured?: string;
  missionsComplete: number;
};

const RANK_TIER: Record<string, string> = {
  CADET: "R1",
  OFFICER: "R2",
  CAPTAIN: "R3",
};

export function OfficerProfile({
  name,
  rank,
  rankLabel,
  rankTier,
  territoryLabel = "Territory Holder",
  districtName = "Bole District",
  xp,
  xpNextRank,
  nextRankLabel,
  progressFraction,
  zonesCaptured,
  merchantsInducted,
  floatSecured = "—",
  missionsComplete,
}: OfficerProfileProps) {
  const displayName = `${RANK_PREFIX[rank] ?? ""} ${name}`.trim() || name;

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 font-mono text-base font-bold text-foreground">Officer Profile</h3>

      <div className="mb-4 flex items-start gap-4">
        <div className="relative flex size-14 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
          <span className="font-mono text-2xl font-bold text-amber-400">
            {rankTier ?? RANK_TIER[rank] ?? "R1"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-lg font-bold text-foreground">{displayName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {territoryLabel} · {districtName}
          </p>
          <span
            className={cn(
              "mt-1 inline-block rounded px-2 py-0.5 font-mono text-[10px] font-semibold uppercase",
              RANK_PILL_CLASS[rank] ?? "bg-muted text-muted-foreground"
            )}
          >
            {rankLabel}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-1 font-mono text-xs font-semibold text-foreground">
          Experience Points
        </p>
        <p className="font-mono text-sm text-muted-foreground">
          {xp.toLocaleString()}
          {xpNextRank != null ? ` / ${(xp + xpNextRank).toLocaleString()} XP` : " XP"}
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-amber-500 transition-[width]"
            style={{ width: `${Math.min(100, progressFraction * 100)}%` }}
          />
        </div>
        {xpNextRank != null && nextRankLabel && (
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">
            {xpNextRank} XP to {nextRankLabel} rank
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <MapPin className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-mono text-xl font-bold text-foreground">{zonesCaptured}</p>
            <p className="font-mono text-[10px] text-muted-foreground">Zones Captured</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <Users className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-mono text-xl font-bold text-foreground">{merchantsInducted}</p>
            <p className="font-mono text-[10px] text-muted-foreground">Merchants Inducted</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <TrendingUp className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-mono text-xl font-bold text-foreground">{floatSecured}</p>
            <p className="font-mono text-[10px] text-muted-foreground">Float Secured</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 p-3">
          <Star className="size-5 shrink-0 text-primary" />
          <div>
            <p className="font-mono text-xl font-bold text-foreground">{missionsComplete}</p>
            <p className="font-mono text-[10px] text-muted-foreground">Missions Complete</p>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <p className="font-mono text-xs font-semibold text-muted-foreground">
          Earned Badges
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          No badges yet. Complete missions to earn badges.
        </p>
      </div>
    </div>
  );
}
