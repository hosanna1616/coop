"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

export type CreateBranchData = {
  name: string;
  location: string;
  branchCode?: string | null;
  externalId?: number | null;
};

export async function createBranch(data: CreateBranchData) {
  const session = await authorize(["ADMIN"], "createBranch");
  const branch = await prisma.branch.create({
    data: {
      name: data.name,
      location: data.location,
      branchCode: data.branchCode ?? undefined,
      externalId: data.externalId ?? undefined,
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "BRANCH_CREATE", {
    entityType: "Branch",
    entityId: branch.id,
    branchId: branch.id,
    metadata: { name: branch.name, branchCode: branch.branchCode },
  });
  return branch;
}

/** Branches from DB for admin dropdowns (create user, create mission, etc.) */
export async function getBranchesFromDb(): Promise<
  { id: string; branchCode: string | null; name: string }[]
> {
  await authorize(["ADMIN", "BRANCH_MANAGER"], "getBranchesFromDb");
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, branchCode: true, name: true },
  });
  return branches;
}

/** Paginated branches for admin branches list. */
export async function getBranchesPaginated(options?: { limit?: number; offset?: number }): Promise<{
  branches: { id: string; branchCode: string | null; name: string }[];
  total: number;
}> {
  await authorize(["ADMIN"], "getBranchesPaginated");
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const [branches, total] = await Promise.all([
    prisma.branch.findMany({
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
      select: { id: true, branchCode: true, name: true },
    }),
    prisma.branch.count(),
  ]);
  return { branches, total };
}
