"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";
import type { RankConfig } from "@/lib/rank";

export type RankRow = RankConfig;

/** Get ordered ranks for app use (profile, dashboard, XP logic). Any authenticated user. */
export async function getRanks(): Promise<RankRow[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getRanks");
  const rows = await prisma.rank.findMany({
    orderBy: [{ displayOrder: "asc" }, { minXp: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    minXp: r.minXp,
    displayOrder: r.displayOrder,
  }));
}

/** Get ranks for admin management. ADMIN only. */
export async function getRanksForAdmin(): Promise<RankRow[]> {
  await authorize(["ADMIN"], "getRanksForAdmin");
  const rows = await prisma.rank.findMany({
    orderBy: [{ displayOrder: "asc" }, { minXp: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    minXp: r.minXp,
    displayOrder: r.displayOrder,
  }));
}

export type CreateRankInput = {
  code: string;
  name: string;
  minXp: number;
  displayOrder?: number;
};

/** Create rank. ADMIN only. */
export async function createRank(input: CreateRankInput): Promise<RankRow> {
  const session = await authorize(["ADMIN"], "createRank");
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code) throw new Error("Rank code is required.");
  if (!name) throw new Error("Rank name is required.");
  if (input.minXp < 0) throw new Error("Min XP must be 0 or greater.");

  const existing = await prisma.rank.findUnique({ where: { code } });
  if (existing) throw new Error("A rank with this code already exists.");

  const rank = await prisma.rank.create({
    data: {
      code,
      name,
      minXp: input.minXp,
      displayOrder: input.displayOrder ?? 0,
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "RANK_CREATE", {
    entityType: "Rank",
    entityId: rank.id,
    metadata: { code: rank.code, name: rank.name },
  });

  return {
    id: rank.id,
    code: rank.code,
    name: rank.name,
    minXp: rank.minXp,
    displayOrder: rank.displayOrder,
  };
}

export type UpdateRankInput = {
  code?: string;
  name?: string;
  minXp?: number;
  displayOrder?: number;
};

/** Update rank. ADMIN only. */
export async function updateRank(
  id: string,
  input: UpdateRankInput
): Promise<RankRow> {
  const session = await authorize(["ADMIN"], "updateRank");
  const existing = await prisma.rank.findUnique({ where: { id } });
  if (!existing) throw new Error("Rank not found.");

  if (input.minXp != null && input.minXp < 0)
    throw new Error("Min XP must be 0 or greater.");
  const code = input.code?.trim().toUpperCase();
  if (code !== undefined && !code) throw new Error("Rank code cannot be empty.");
  if (code && code !== existing.code) {
    const duplicate = await prisma.rank.findUnique({ where: { code } });
    if (duplicate) throw new Error("Another rank already has this code.");
  }

  const rank = await prisma.rank.update({
    where: { id },
    data: {
      ...(input.code != null && { code: code ?? existing.code }),
      ...(input.name != null && { name: input.name.trim() }),
      ...(input.minXp != null && { minXp: input.minXp }),
      ...(input.displayOrder != null && { displayOrder: input.displayOrder }),
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "RANK_UPDATE", {
    entityType: "Rank",
    entityId: rank.id,
    metadata: { code: rank.code, name: rank.name },
  });

  return {
    id: rank.id,
    code: rank.code,
    name: rank.name,
    minXp: rank.minXp,
    displayOrder: rank.displayOrder,
  };
}

/** Delete rank. ADMIN only. Fails if any user has this rank. */
export async function deleteRank(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteRank");
  const existing = await prisma.rank.findUnique({
    where: { id },
    select: { id: true, code: true, name: true },
  });
  if (!existing) throw new Error("Rank not found.");

  const userCount = await prisma.user.count({
    where: { rank: existing.code },
  });
  if (userCount > 0)
    throw new Error(
      `Cannot delete rank "${existing.name}": ${userCount} user(s) have this rank. Reassign them first.`
    );

  await prisma.rank.delete({ where: { id } });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "RANK_DELETE", {
    entityType: "Rank",
    entityId: id,
    metadata: { code: existing.code, name: existing.name },
  });
}
