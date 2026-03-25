import { prisma } from "@/lib/prisma";

export async function createBranch(params: {
  name: string;
  location: string;
  branchCode?: string | null;
  externalId?: number | null;
}) {
  return prisma.branch.create({
    data: {
      name: params.name,
      location: params.location,
      branchCode: params.branchCode ?? undefined,
      externalId: params.externalId ?? undefined,
    },
  });
}

export async function listBranchesFromDb(): Promise<{ id: string; branchCode: string | null; name: string }[]> {
  return prisma.branch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, branchCode: true, name: true },
  });
}

export async function listBranchesPaginated(options?: { limit?: number; offset?: number }): Promise<{
  branches: { id: string; branchCode: string | null; name: string }[];
  total: number;
}> {
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

