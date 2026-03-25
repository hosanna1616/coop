"use server";

import {
  createBranch as createBranchService,
  getBranchesFromDb as getBranchesFromDbService,
  getBranchesPaginated as getBranchesPaginatedService,
} from "@/backend/services/branches-service";

export type CreateBranchData = {
  name: string;
  location: string;
  branchCode?: string | null;
  externalId?: number | null;
};

export async function createBranch(data: CreateBranchData) {
  return createBranchService(data);
}

/** Branches from DB for admin dropdowns (create user, create mission, etc.) */
export async function getBranchesFromDb(): Promise<
  { id: string; branchCode: string | null; name: string }[]
> {
  return getBranchesFromDbService();
}

/** Paginated branches for admin branches list. */
export async function getBranchesPaginated(options?: { limit?: number; offset?: number }): Promise<{
  branches: { id: string; branchCode: string | null; name: string }[];
  total: number;
}> {
  return getBranchesPaginatedService(options);
}
