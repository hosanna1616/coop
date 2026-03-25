"use server";

import type { ZoneStatus } from "@prisma/client";
import { getZones as getZonesService, updateZoneStatus as updateZoneStatusService } from "@/backend/services/zones-service";

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
  return getZonesService(branchId);
}

export async function updateZoneStatus(zoneId: string, newStatus: ZoneStatus) {
  return updateZoneStatusService(zoneId, newStatus);
}
