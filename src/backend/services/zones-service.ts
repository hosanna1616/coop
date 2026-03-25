import { authorize, type Role } from "@/lib/auth";
import type { ZoneStatus } from "@prisma/client";
import * as zonesRepo from "@/backend/repositories/zones-repository";
import { getUserById } from "@/backend/repositories/user-repository";
import * as activityLogService from "@/backend/services/activity-log-service";

export type ZoneWithStats = zonesRepo.ZoneWithStats;

const PLAYER_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  UNSEEN: ["SCOUTED"],
  SCOUTED: ["CAPTURED", "AT_RISK"],
  CAPTURED: ["FORTIFIED", "AT_RISK"],
  FORTIFIED: ["AT_RISK"],
  AT_RISK: ["CAPTURED", "LOST"],
  LOST: ["SCOUTED", "CAPTURED"],
};

export async function getZones(branchId?: string | null): Promise<ZoneWithStats[]> {
  return zonesRepo.listZones(branchId);
}

export async function updateZoneStatus(zoneId: string, newStatus: ZoneStatus): Promise<void> {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"] as Role[],
    "updateZoneStatus"
  );

  const zone = await zonesRepo.getZoneForUpdate(zoneId);
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

  await zonesRepo.updateZoneStatus(zoneId, newStatus);

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "User", "ZONE_STATUS_UPDATE", {
    entityType: "Zone",
    entityId: zoneId,
    branchId: zone.branchId,
    metadata: { previousStatus: zone.status, newStatus },
  });
}

