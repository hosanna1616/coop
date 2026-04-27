import {
  getCurrentUser,
  getLeaderboard,
  getProfileStats,
} from "@/app/actions/users";
import { getRanks } from "@/app/actions/ranks";
import {
  getContributionActivityData,
  getGamificationData,
} from "@/app/actions/gamification";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { xpProgress, xpToNextRank, nextRankLabel } from "@/lib/rank";
import { ProfileClient } from "./ProfileClient";
import type { RankConfig } from "@/lib/rank";
import type { RankStage } from "./ProfileClient";

export const dynamic = "force-dynamic";

function buildStagesFromRanks(ranks: RankConfig[]): RankStage[] {
  const sorted = [...ranks].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.minXp - b.minXp,
  );
  return sorted.map((r, i) => {
    const next = sorted[i + 1];
    const xpRange = next
      ? `${r.minXp.toLocaleString()}–${next.minXp.toLocaleString()} XP`
      : `${r.minXp.toLocaleString()}+ XP`;
    return {
      id: r.code,
      shortLabel: r.name,
      tier: `R${i + 1}`,
      xpRange,
    };
  });
}

function buildRankLabels(ranks: RankConfig[]): Record<string, string> {
  const sorted = [...ranks].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.minXp - b.minXp,
  );
  const map: Record<string, string> = {};
  sorted.forEach((r, i) => {
    map[r.code] = `R${i + 1} ${r.name}`;
  });
  return map;
}

export default async function ProfilePage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser(session.id);
  if (!user) {
    redirect("/login");
  }

  const branchIdForLeaderboard = user.branchId ?? user.team?.branchId ?? null;
  const isAdmin = user.role === "ADMIN";

  let ranks: RankConfig[] = [];
  try {
    ranks = await getRanks();
  } catch {
    ranks = [];
  }

  const rankLabels = buildRankLabels(ranks);
  const rankStages = buildStagesFromRanks(ranks);
  const xpProgressData = xpProgress(ranks, user.xp);
  const xpToNext = xpToNextRank(ranks, user.xp);
  const nextLabel = nextRankLabel(ranks, user.xp);

  const [userStats, leaderboard, contribution, gamificationData] =
    await Promise.all([
      getProfileStats(user.id, {
        branchId: branchIdForLeaderboard,
        role: user.role,
      }),
      isAdmin
        ? Promise.resolve([])
        : getLeaderboard(50, null),
      getContributionActivityData(365),
      getGamificationData(),
    ]);

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        rank: user.rank,
        role: user.role,
        xp: user.xp,
        rankLabel: rankLabels[user.rank] ?? user.rank,
        teamName: user.team?.name ?? null,
        progressFraction: xpProgressData.progressFraction,
        nextTierMax: xpProgressData.nextTierMax,
        xpToNextRank: xpToNext,
        nextRankLabel: nextLabel,
      }}
      rankStages={rankStages}
      stats={userStats}
      leaderboard={leaderboard.map((u) => ({
        id: u.id,
        name: u.name,
        rank: u.rank,
        xp: u.xp,
        zones: u.zones,
        scouts: u.scouts,
        managerName: u.managerName,
        latestZoneCode: u.latestZoneCode,
        rankLabel: rankLabels[u.rank] ?? u.rank,
      }))}
      currentUserId={user.id}
      contribution={contribution}
      gamificationData={gamificationData}
    />
  );
}
