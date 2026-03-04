import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCurrentUser, getLeaderboardForDashboard, getProfileStats } from "@/app/actions/users";
import { getTerritoryDashboardStats } from "@/app/actions/mission";
import { getBranchTerritoryForMember, getTerritoryCellsForMember, getAllBranchTerritoriesForAdmin } from "@/app/actions/branch-territory";
import { xpProgress, xpToNextRank, nextRankLabel } from "@/lib/rank";
import { TerritoryDashboard } from "@/components/territory/TerritoryDashboard";

export const dynamic = "force-dynamic";

const RANK_LABELS: Record<string, string> = {
  CADET: "R1 - CADET",
  OFFICER: "R2 - OFFICER",
  CAPTAIN: "R3 - CAPTAIN",
};

export default async function HomePage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser(session.id);
  if (!user) redirect("/login");

  const branchIdForStatsAndMap =
    session.role === "ADMIN"
      ? null
      : (session.branchId ?? user.branchId ?? user.team?.branchId ?? null);

  const isAdmin = session.role === "ADMIN";
  const isBranchManager = session.role === "BRANCH_MANAGER";

  const [stats, leaderboardData, profileStats, xpProgressData, branchTerritory, territoryCells, adminTerritories] =
    await Promise.all([
      getTerritoryDashboardStats(branchIdForStatsAndMap),
      getLeaderboardForDashboard(
        5,
        user.id,
        session.role === "ADMIN" ? null : (user.branchId ?? user.team?.branchId ?? null)
      ),
      getProfileStats(user.id, {
        branchId: session.role === "ADMIN" ? null : (user.branchId ?? user.team?.branchId ?? null),
        role: session.role,
      }),
      Promise.resolve(xpProgress(user.xp)),
      !isAdmin && branchIdForStatsAndMap
        ? getBranchTerritoryForMember(branchIdForStatsAndMap).catch(() => null)
        : Promise.resolve(null),
      !isAdmin && branchIdForStatsAndMap
        ? getTerritoryCellsForMember(branchIdForStatsAndMap).catch(() => [])
        : Promise.resolve([]),
      isAdmin ? getAllBranchTerritoriesForAdmin().catch(() => []) : Promise.resolve([]),
    ]);

  const useGoogleMaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);

  const leaderboardEntries = leaderboardData.entries.map((u) => ({
    id: u.id,
    name: u.name,
    rank: u.rank,
    xp: u.xp,
    zones: u.zones,
    rankLabel: RANK_LABELS[u.rank] ?? u.rank,
  }));

  const currentUserEntry = leaderboardData.currentUserEntry
    ? {
        id: leaderboardData.currentUserEntry.id,
        name: leaderboardData.currentUserEntry.name,
        rank: leaderboardData.currentUserEntry.rank,
        xp: leaderboardData.currentUserEntry.xp,
        zones: leaderboardData.currentUserEntry.zones,
        rankLabel: RANK_LABELS[leaderboardData.currentUserEntry.rank] ?? leaderboardData.currentUserEntry.rank,
      }
    : null;

  const districtName =
    session.role === "ADMIN"
      ? "All Branches"
      : (user.branch?.name ?? "Branch");

  return (
    <TerritoryDashboard
      userName={user.name}
      rankLabel={session.role === "ADMIN" ? "Admin" : (RANK_LABELS[user.rank] ?? user.rank)}
      zonesCaptured={stats.zonesCaptured}
      zonesAtRisk={stats.zonesAtRisk}
      activeMerchants={stats.activeMerchants}
      activeMissions={stats.activeMissions}
      totalZones={stats.totalZones}
      useGoogleMaps={useGoogleMaps}
      districtName={districtName}
      leaderboardEntries={leaderboardEntries}
      leaderboardPosition={leaderboardData.position}
      leaderboardCurrentUserEntry={currentUserEntry}
      xpToNextRank={xpToNextRank(user.xp)}
      nextRankLabel={nextRankLabel(user.xp)}
      profileStats={{
        zonesCaptured: profileStats.zonesCaptured,
        merchantsInducted: profileStats.merchantsInducted,
        progressFraction: xpProgressData.progressFraction,
        missionsComplete: profileStats.missionsCompleted,
      }}
      currentUserId={user.id}
      currentUserXp={user.xp}
      currentUserRank={user.rank}
      showOfficerProfile={session.role !== "ADMIN"}
      branchId={branchIdForStatsAndMap}
      branchTerritory={branchTerritory ?? null}
      territoryCells={territoryCells}
      isBranchManager={isBranchManager}
      adminTerritories={isAdmin ? adminTerritories : undefined}
    />
  );
}
