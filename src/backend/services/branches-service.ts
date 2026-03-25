import { authorize } from "@/lib/auth";
import * as branchesRepo from "@/backend/repositories/branches-repository";
import { getUserById } from "@/backend/repositories/user-repository";
import * as activityLogService from "@/backend/services/activity-log-service";

export type CreateBranchData = {
  name: string;
  location: string;
  branchCode?: string | null;
  externalId?: number | null;
};

export async function createBranch(data: CreateBranchData) {
  const session = await authorize(["ADMIN"], "createBranch");

  const branch = await branchesRepo.createBranch({
    name: data.name,
    location: data.location,
    branchCode: data.branchCode ?? undefined,
    externalId: data.externalId ?? undefined,
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "Admin", "BRANCH_CREATE", {
    entityType: "Branch",
    entityId: branch.id,
    branchId: branch.id,
    metadata: { name: branch.name, branchCode: branch.branchCode },
  });

  return branch;
}

/** Branches from DB for admin dropdowns (create user, create mission, etc.) */
export async function getBranchesFromDb(): Promise<{ id: string; branchCode: string | null; name: string }[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER"], "getBranchesFromDb");
  return branchesRepo.listBranchesFromDb();
}

/** Paginated branches for admin branches list. */
export async function getBranchesPaginated(options?: { limit?: number; offset?: number }): Promise<{
  branches: { id: string; branchCode: string | null; name: string }[];
  total: number;
}> {
  await authorize(["ADMIN"], "getBranchesPaginated");
  return branchesRepo.listBranchesPaginated(options);
}

