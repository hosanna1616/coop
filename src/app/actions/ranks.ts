"use server";

import type { RankConfig } from "@/lib/rank";
import {
  createRank as createRankService,
  deleteRank as deleteRankService,
  getRanks as getRanksService,
  getRanksForAdmin as getRanksForAdminService,
  updateRank as updateRankService,
} from "@/backend/services/ranks-service";

export type RankRow = RankConfig;

export type CreateRankInput = {
  code: string;
  name: string;
  minXp: number;
  displayOrder?: number;
};

export type UpdateRankInput = {
  code?: string;
  name?: string;
  minXp?: number;
  displayOrder?: number;
};

/** Get ordered ranks for app use (profile, dashboard, XP logic). Any authenticated user. */
export async function getRanks(): Promise<RankRow[]> {
  return getRanksService();
}

/** Get ranks for admin management. ADMIN only. */
export async function getRanksForAdmin(): Promise<RankRow[]> {
  return getRanksForAdminService();
}

/** Create rank. ADMIN only. */
export async function createRank(input: CreateRankInput): Promise<RankRow> {
  return createRankService(input);
}

/** Update rank. ADMIN only. */
export async function updateRank(
  id: string,
  input: UpdateRankInput
): Promise<RankRow> {
  return updateRankService(id, input);
}

/** Delete rank. ADMIN only. Fails if any user has this rank. */
export async function deleteRank(id: string): Promise<void> {
  return deleteRankService(id);
}
