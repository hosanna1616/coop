"use server";

import { prisma } from "@/lib/prisma";
import { authorize, type Role } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

export type CreateTeamData = {
  name: string;
  /** Required when caller is ADMIN; ignored when caller is BRANCH_MANAGER (uses their branch). */
  branchId?: string | null;
};

/**
 * Create a team for a branch.
 * - ADMIN: must pass branchId (team is created for that branch).
 * - BRANCH_MANAGER: can only create teams for their own branch; branchId is ignored.
 */
export async function createTeam(data: CreateTeamData) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"] as Role[], "createTeam");

  let branchId: string | null = null;

  if (session.role === "ADMIN") {
    branchId = data.branchId ?? null;
    if (!branchId) throw new Error("Please select a branch for the team.");
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, name: true },
    });
    if (!branch) throw new Error("Branch not found.");
  } else {
    if (!session.branchId) throw new Error("Branch manager has no branch assigned.");
    branchId = session.branchId;
  }

  const team = await prisma.team.create({
    data: {
      name: data.name.trim(),
      branchId,
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "TEAM_CREATE", {
    entityType: "Team",
    entityId: team.id,
    branchId,
    metadata: { name: team.name },
  });

  return team;
}
