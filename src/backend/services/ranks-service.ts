import { authorize } from "@/lib/auth";
import * as activityLogService from "@/backend/services/activity-log-service";
import * as ranksRepo from "@/backend/repositories/ranks-repository";
import type { RankConfig } from "@/lib/rank";
import { getUserById } from "@/backend/repositories/user-repository";

export type { RankConfig };

export async function getRanks(): Promise<RankConfig[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getRanks");
  return ranksRepo.listRanks();
}

export async function getRanksForAdmin(): Promise<RankConfig[]> {
  await authorize(["ADMIN"], "getRanksForAdmin");
  return ranksRepo.listRanks();
}

export type CreateRankInput = {
  code: string;
  name: string;
  minXp: number;
  displayOrder?: number;
};

export async function createRank(input: CreateRankInput): Promise<RankConfig> {
  const session = await authorize(["ADMIN"], "createRank");

  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code) throw new Error("Rank code is required.");
  if (!name) throw new Error("Rank name is required.");
  if (input.minXp < 0) throw new Error("Min XP must be 0 or greater.");

  const existing = await ranksRepo.findRankByCode(code);
  if (existing) throw new Error("A rank with this code already exists.");

  const rank = await ranksRepo.createRank({
    code,
    name,
    minXp: input.minXp,
    displayOrder: input.displayOrder ?? 0,
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(
    session,
    actor ?? "Admin",
    "RANK_CREATE",
    {
      entityType: "Rank",
      entityId: rank.id,
      metadata: { code: rank.code, name: rank.name },
    }
  );

  return rank;
}

export type UpdateRankInput = {
  code?: string;
  name?: string;
  minXp?: number;
  displayOrder?: number;
};

export async function updateRank(id: string, input: UpdateRankInput): Promise<RankConfig> {
  const session = await authorize(["ADMIN"], "updateRank");

  const existing = await ranksRepo.findRankById(id);
  if (!existing) throw new Error("Rank not found.");

  if (input.minXp != null && input.minXp < 0) throw new Error("Min XP must be 0 or greater.");

  const code = input.code?.trim().toUpperCase();
  if (code !== undefined && !code) throw new Error("Rank code cannot be empty.");

  if (code && code !== existing.code) {
    const duplicate = await ranksRepo.findRankByCode(code);
    if (duplicate) throw new Error("Another rank already has this code.");
  }

  const rank = await ranksRepo.updateRank(id, {
    ...(input.code != null && { code: code ?? existing.code }),
    ...(input.name != null && { name: input.name.trim() }),
    ...(input.minXp != null && { minXp: input.minXp }),
    ...(input.displayOrder != null && { displayOrder: input.displayOrder }),
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(
    session,
    actor ?? "Admin",
    "RANK_UPDATE",
    {
      entityType: "Rank",
      entityId: rank.id,
      metadata: { code: rank.code, name: rank.name },
    }
  );

  return rank;
}

/** Delete rank. ADMIN only. Fails if any user has this rank. */
export async function deleteRank(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteRank");

  const existing = await ranksRepo.findRankById(id);
  if (!existing) throw new Error("Rank not found.");

  const userCount = await ranksRepo.countUsersWithRankCode(existing.code);
  if (userCount > 0) {
    throw new Error(
      `Cannot delete rank "${existing.name}": ${userCount} user(s) have this rank. Reassign them first.`
    );
  }

  await ranksRepo.deleteRank(id);

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(
    session,
    actor ?? "Admin",
    "RANK_DELETE",
    {
      entityType: "Rank",
      entityId: id,
      metadata: { code: existing.code, name: existing.name },
    }
  );
}

