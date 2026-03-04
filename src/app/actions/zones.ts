"use server";

import { prisma } from "@/lib/prisma";
import { authorize, type Role } from "@/lib/auth";
import type { ZoneStatus } from "@prisma/client";

export type ZoneWithStats = {
  id: string;
  code: string;
  coordinates: unknown;
  status: ZoneStatus;
  ownerId: string | null;
  leadCount: number;
  ownerName: string | null;
};

export async function getZones(branchId?: string | null): Promise<ZoneWithStats[]> {
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

const PLAYER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  UNSEEN: ["SCOUTED"],
  SCOUTED: ["CAPTURED", "AT_RISK"],
  CAPTURED: ["FORTIFIED", "AT_RISK"],
  FORTIFIED: ["AT_RISK"],
  AT_RISK: ["CAPTURED", "LOST"],
  LOST: ["SCOUTED", "CAPTURED"],
};

export async function updateZoneStatus(zoneId: string, newStatus: ZoneStatus) {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"] as Role[],
    "updateZoneStatus"
  );
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: { id: true, status: true, branchId: true },
  });
  if (!zone) throw new Error("Zone not found");

  if (session.role === "PLAYER") {
    const allowed = PLAYER_ALLOWED_TRANSITIONS[zone.status];
    if (!allowed?.includes(newStatus)) {
      throw new Error(`Players cannot change status from ${zone.status} to ${newStatus}`);
    }
  } else if (session.role === "BRANCH_MANAGER") {
    if (zone.branchId !== session.branchId) {
      throw new Error("You can only override zones in your branch");
    }
  }
  await prisma.zone.update({
    where: { id: zoneId },
    data: { status: newStatus },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  const { logActivity } = await import("@/app/actions/activity-log");
  await logActivity(session, actor?.name ?? "User", "ZONE_STATUS_UPDATE", {
    entityType: "Zone",
    entityId: zoneId,
    branchId: zone.branchId,
    metadata: { previousStatus: zone.status, newStatus },
  });
}
