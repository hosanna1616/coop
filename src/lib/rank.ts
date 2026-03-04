import type { UserRank } from "@prisma/client";

const XP_CADET_MAX = 500;
const XP_OFFICER_MAX = 2000;

export function rankFromXp(xp: number): UserRank {
  if (xp >= XP_OFFICER_MAX) return "CAPTAIN";
  if (xp >= XP_CADET_MAX) return "OFFICER";
  return "CADET";
}

export function xpProgress(xp: number): {
  rank: UserRank;
  currentTierMin: number;
  nextTierMax: number | null;
  progressFraction: number;
} {
  const rank = rankFromXp(xp);
  let currentTierMin = 0;
  let nextTierMax: number | null = XP_CADET_MAX;
  if (rank === "OFFICER") {
    currentTierMin = XP_CADET_MAX;
    nextTierMax = XP_OFFICER_MAX;
  } else if (rank === "CAPTAIN") {
    currentTierMin = XP_OFFICER_MAX;
    nextTierMax = null;
  }
  const tierSize = nextTierMax != null ? nextTierMax - currentTierMin : 1;
  const progressInTier = nextTierMax != null ? xp - currentTierMin : 1;
  const progressFraction = nextTierMax != null ? progressInTier / tierSize : 1;
  return {
    rank,
    currentTierMin,
    nextTierMax,
    progressFraction: Math.min(1, Math.max(0, progressFraction)),
  };
}

/** XP needed to reach next rank, or null if at max rank. */
export function xpToNextRank(xp: number): number | null {
  const { nextTierMax } = xpProgress(xp);
  if (nextTierMax == null) return null;
  return Math.max(0, nextTierMax - xp);
}

/** Label for next rank (e.g. "Officer", "Captain", "Commander"), or null if at max. */
export function nextRankLabel(xp: number): string | null {
  const { rank, nextTierMax } = xpProgress(xp);
  if (nextTierMax == null) return null;
  if (rank === "CADET") return "Officer";
  if (rank === "OFFICER") return "Captain";
  return "Commander";
}
