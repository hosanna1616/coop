/** Rank configuration used by pure helpers. Matches Rank table shape for display order. */
export type RankConfig = {
  id: string;
  code: string;
  name: string;
  minXp: number;
  displayOrder: number;
};

/** Ordered ranks by displayOrder then minXp (assumed already sorted from DB). */
function sortedRanks(ranks: RankConfig[]): RankConfig[] {
  return [...ranks].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.minXp - b.minXp
  );
}

/** Returns the code of the highest rank whose minXp <= xp. Empty ranks: returns empty string. */
export function rankFromXp(ranks: RankConfig[], xp: number): string {
  const sorted = sortedRanks(ranks);
  let match = sorted[0]?.code ?? "";
  for (const r of sorted) {
    if (xp >= r.minXp) match = r.code;
  }
  return match;
}

export function xpProgress(
  ranks: RankConfig[],
  xp: number
): {
  rank: string;
  currentTierMin: number;
  nextTierMax: number | null;
  progressFraction: number;
} {
  const sorted = sortedRanks(ranks);
  const rankCode = rankFromXp(ranks, xp);
  const currentIndex = sorted.findIndex((r) => r.code === rankCode);
  const currentRank = currentIndex >= 0 ? sorted[currentIndex]! : sorted[0];
  const nextRank = currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1]! : null;

  const currentTierMin = currentRank?.minXp ?? 0;
  const nextTierMax = nextRank?.minXp ?? null;
  const tierSize = nextTierMax != null ? nextTierMax - currentTierMin : 1;
  const progressInTier = nextTierMax != null ? xp - currentTierMin : 1;
  const progressFraction =
    nextTierMax != null ? progressInTier / tierSize : 1;

  return {
    rank: rankCode,
    currentTierMin,
    nextTierMax,
    progressFraction: Math.min(1, Math.max(0, progressFraction)),
  };
}

/** XP needed to reach next rank, or null if at max rank. */
export function xpToNextRank(ranks: RankConfig[], xp: number): number | null {
  const { nextTierMax } = xpProgress(ranks, xp);
  if (nextTierMax == null) return null;
  return Math.max(0, nextTierMax - xp);
}

/** Display name of next rank, or null if at max. */
export function nextRankLabel(ranks: RankConfig[], xp: number): string | null {
  const sorted = sortedRanks(ranks);
  const rankCode = rankFromXp(ranks, xp);
  const currentIndex = sorted.findIndex((r) => r.code === rankCode);
  const nextRank =
    currentIndex >= 0 && currentIndex < sorted.length - 1 ? sorted[currentIndex + 1]! : null;
  return nextRank?.name ?? null;
}

/** Code of the default (lowest) rank for new users. */
export function getDefaultRankCode(ranks: RankConfig[]): string {
  const sorted = sortedRanks(ranks);
  return sorted[0]?.code ?? "CADET";
}
