import type { ZoneStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ZoneWithStats = {
  id: string;
  code: string;
  coordinates: unknown;
  status: ZoneStatus;
  ownerId: string | null;
  leadCount: number;
  ownerName: string | null;
};

export async function listZones(branchId?: string | null): Promise<ZoneWithStats[]> {
  const zones = await prisma.zone.findMany({
    where: branchId ? { branchId } : undefined,
    include: {
      owner: { select: { name: true } },
      _count: { select: { leads: true } },
    },
    orderBy: { code: "asc" },
  });

  return zones.map((z) => ({
    id: z.id,
    code: z.code,
    coordinates: z.coordinates,
    status: z.status,
    ownerId: z.ownerId,
    leadCount: z._count.leads,
    ownerName: z.owner?.name ?? null,
  }));
}

export async function getZoneForUpdate(zoneId: string): Promise<{
  id: string;
  status: ZoneStatus;
  branchId: string | null;
} | null> {
  return prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true, status: true, branchId: true },
  });
}

export async function updateZoneStatus(
  zoneId: string,
  newStatus: ZoneStatus
): Promise<{ id: string; status: ZoneStatus; branchId: string | null }> {
  const zone = await prisma.zone.update({
    where: { id: zoneId },
    data: { status: newStatus },
    select: { id: true, status: true, branchId: true },
  });
  return zone;
}

