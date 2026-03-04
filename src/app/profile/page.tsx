import { getCurrentUser, getLeaderboard, getProfileStats } from "@/app/actions/users";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { xpProgress } from "@/lib/rank";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

const RANK_LABELS: Record<string, string> = {
  CADET: "R1 Cadet",
  OFFICER: "R2 Officer",
  CAPTAIN: "R3 Captain",
};

export default async function ProfilePage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const user = await getCurrentUser(session.id);
  if (!user) {
    redirect("/login");
  }

  const branchIdForLeaderboard = user.branchId ?? user.team?.branchId ?? null;
  const isAdmin = user.role === "ADMIN";
  const [userStats, xpProgressData, leaderboard] = await Promise.all([
    getProfileStats(user.id, {
      branchId: branchIdForLeaderboard,
      role: user.role,
    }),
    Promise.resolve(xpProgress(user.xp)),
    isAdmin ? Promise.resolve([]) : getLeaderboard(20, branchIdForLeaderboard),
  ]);

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        rank: user.rank,
        role: user.role,
        xp: user.xp,
        rankLabel: RANK_LABELS[user.rank] ?? user.rank,
        teamName: user.team?.name ?? null,
        progressFraction: xpProgressData.progressFraction,
        nextTierMax: xpProgressData.nextTierMax,
      }}
      stats={userStats}
      leaderboard={leaderboard.map((u) => ({
        id: u.id,
        name: u.name,
        rank: u.rank,
        xp: u.xp,
        zones: u.zones,
        rankLabel: RANK_LABELS[u.rank] ?? u.rank,
      }))}
      currentUserId={user.id}
      isBranchLeaderboard={!!branchIdForLeaderboard}
    />
  );
}
