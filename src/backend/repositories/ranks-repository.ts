import { prisma } from "@/lib/prisma";
import type { RankConfig } from "@/lib/rank";

function mapRankToConfig(r: {
  id: string;
  code: string;
  name: string;
  minXp: number;
  displayOrder: number;
}): RankConfig {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    minXp: r.minXp,
    displayOrder: r.displayOrder,
  };
}

export async function listRanks(): Promise<RankConfig[]> {
  const rows = await prisma.rank.findMany({
    orderBy: [{ displayOrder: "asc" }, { minXp: "asc" }],
  });
  return rows.map(mapRankToConfig);
}

export async function findRankByCode(code: string): Promise<RankConfig | null> {
  const r = await prisma.rank.findUnique({ where: { code } });
  if (!r) return null;
  return mapRankToConfig(r);
}

export async function findRankById(id: string): Promise<RankConfig | null> {
  const r = await prisma.rank.findUnique({ where: { id } });
  if (!r) return null;
  return mapRankToConfig(r);
}

export async function createRank(params: {
  code: string;
  name: string;
  minXp: number;
  displayOrder: number;
}): Promise<RankConfig> {
  const rank = await prisma.rank.create({
    data: {
      code: params.code,
      name: params.name,
      minXp: params.minXp,
      displayOrder: params.displayOrder,
    },
  });
  return mapRankToConfig(rank);
}

export async function updateRank(
  id: string,
  params: Partial<{ code: string; name: string; minXp: number; displayOrder: number }>
): Promise<RankConfig> {
  const rank = await prisma.rank.update({
    where: { id },
    data: params,
  });
  return mapRankToConfig(rank);
}

export async function deleteRank(id: string): Promise<void> {
  await prisma.rank.delete({ where: { id } });
}

export async function countUsersWithRankCode(rankCode: string): Promise<number> {
  return prisma.user.count({
    where: { rank: rankCode },
  });
}

