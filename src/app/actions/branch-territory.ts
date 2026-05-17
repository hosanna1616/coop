"use server";

import { prisma } from "@/lib/prisma";
import { authorize, type Role } from "@/lib/auth";
import {
  normalizeTerritoryPoints,
  validateTerritoryShape,
  MIN_TERRITORY_CELLS,
} from "@/lib/territoryGrid";
import { logActivity } from "@/app/actions/activity-log";
import { routeNotification } from "@/backend/services/notification-router-service";
import type { ZoneStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

function canAccessBranch(session: { role: Role; branchId: string | null }, branchId: string): boolean {
  if (session.role === "ADMIN") return true;
  if (session.role === "BRANCH_MANAGER" && session.branchId === branchId) return true;
  return false;
}

/** True if user can read (view) this branch's territory: admin, branch manager of branch, or player in branch. */
async function canAccessBranchForRead(branchId: string): Promise<boolean> {
  const { getServerAuthSession } = await import("@/lib/auth");
  const session = await getServerAuthSession();
  if (!session) return false;
  if (session.role === "ADMIN") return true;
  if (session.role === "BRANCH_MANAGER" && session.branchId === branchId) return true;
  if (session.role === "PLAYER") {
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: { branchId: true, team: { select: { branchId: true } } },
    });
    const userBranchId = user?.branchId ?? user?.team?.branchId ?? null;
    return userBranchId === branchId;
  }
  return false;
}

/** Read-only: get branch territory bounds for any member of that branch (player, branch manager, admin). */
export async function getBranchTerritoryForMember(
  branchId: string | null
): Promise<{ lat: number; lng: number }[] | null> {
  if (!branchId) return null;
  const ok = await canAccessBranchForRead(branchId);
  if (!ok) return null;

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { territoryBounds: true },
  });
  if (!branch?.territoryBounds) return null;

  const bounds = branch.territoryBounds as { lat: number; lng: number }[];
  return Array.isArray(bounds) ? bounds : null;
}

/** Read-only: get territory cells for any member of that branch (player, branch manager, admin). */
export async function getTerritoryCellsForMember(
  branchId: string | null
): Promise<TerritoryCellWithCoords[]> {
  if (!branchId) return [];
  const ok = await canAccessBranchForRead(branchId);
  if (!ok) return [];

  const cells = await prisma.territoryCell.findMany({
    where: { branchId },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });

  return cells.map((c) => ({
    id: c.id,
    code: c.code,
    coordinates: c.coordinates as { lat: number; lng: number }[],
    status: c.status,
    label: c.label,
    row: c.row,
    col: c.col,
  }));
}

function validatePoint(p: { lat: number; lng: number }): boolean {
  return (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    p.lat >= -90 &&
    p.lat <= 90 &&
    p.lng >= -180 &&
    p.lng <= 180
  );
}

export async function getBranchTerritory(
  branchId: string | null
): Promise<{ lat: number; lng: number }[] | null> {
  if (!branchId) return null;
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"] as Role[], "getBranchTerritory");
  if (!canAccessBranch(session, branchId)) throw new Error("Access denied");

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { territoryBounds: true },
  });
  if (!branch?.territoryBounds) return null;

  const bounds = branch.territoryBounds as { lat: number; lng: number }[];
  return Array.isArray(bounds) ? bounds : null;
}

export async function saveBranchTerritory(
  branchId: string,
  points: { lat: number; lng: number }[]
): Promise<void> {
  const session = await authorize(["BRANCH_MANAGER"] as Role[], "saveBranchTerritory");
  if (!canAccessBranch(session, branchId)) throw new Error("Access denied");

  if (!points || points.length < 4) throw new Error("At least 4 points are required");
  if (!points.every(validatePoint)) throw new Error("Invalid coordinates");

  const shape = validateTerritoryShape(points);
  if (!shape.ok) {
    throw new Error(shape.error ?? "Invalid territory shape");
  }
  const normalizedPoints = normalizeTerritoryPoints(points);
  const previewCells = shape.cells;

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true },
  });
  if (!branch) throw new Error("Branch not found");

  if (previewCells.length < MIN_TERRITORY_CELLS) {
    throw new Error(
      "Territory is too small. Click four corners that form a wider box.",
    );
  }

  const existingCells = await prisma.territoryCell.findMany({
    where: { branchId },
    select: { row: true, col: true, status: true, label: true },
  });
  const statusByKey = new Map(
    existingCells.map((c) => [`${c.row}_${c.col}`, { status: c.status, label: c.label }])
  );

  await prisma.$transaction(async (tx) => {
    await tx.branch.update({
      where: { id: branchId },
      data: { territoryBounds: normalizedPoints as unknown as Prisma.InputJsonValue },
    });

    await tx.territoryCell.deleteMany({ where: { branchId } });

    for (const c of previewCells) {
      const key = `${c.row}_${c.col}`;
      const preserved = statusByKey.get(key);
      await tx.territoryCell.create({
        data: {
          branchId,
          code: c.code,
          coordinates: c.coordinates as unknown as Prisma.InputJsonValue,
          row: c.row,
          col: c.col,
          status: preserved?.status ?? "UNSEEN",
          label: preserved?.label ?? null,
        },
      });
    }
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "BRANCH_TERRITORY_SAVE", {
    entityType: "Branch",
    entityId: branchId,
    metadata: { pointCount: normalizedPoints.length },
  });

  const players = await prisma.user.findMany({
    where: {
      role: "PLAYER",
      OR: [{ branchId }, { team: { branchId } }],
    },
    select: { id: true },
  });
  await Promise.all(
    players.map((p) =>
      routeNotification({
        userId: p.id,
        type: "TERRITORY_ASSIGNED",
        title: "Your field territory is ready",
        message: `${branch.name}: your branch manager assigned your operating area. Open Territory Command on the map to start scouting.`,
        priority: "HIGH",
        actionUrl: "/",
        branchId,
      }),
    ),
  );
}

export type TerritoryCellWithCoords = {
  id: string;
  code: string;
  coordinates: { lat: number; lng: number }[];
  status: string;
  label: string | null;
  row: number;
  col: number;
};

export type TerritoryCellWithBranchName = TerritoryCellWithCoords & { branchName: string; branchId: string };

export type AdminBranchTerritory = {
  branchId: string;
  branchName: string;
  territoryBounds: { lat: number; lng: number }[];
  cells: TerritoryCellWithBranchName[];
};

export async function getAllBranchTerritoriesForAdmin(): Promise<AdminBranchTerritory[]> {
  await authorize(["ADMIN"] as Role[], "getAllBranchTerritoriesForAdmin");

  const branches = await prisma.branch.findMany({
    where: { territoryBounds: { not: Prisma.DbNull } },
    select: {
      id: true,
      name: true,
      territoryBounds: true,
      territoryCells: {
        orderBy: [{ row: "asc" }, { col: "asc" }],
      },
    },
  });

  return branches.map((b) => ({
    branchId: b.id,
    branchName: b.name,
    territoryBounds: (b.territoryBounds as { lat: number; lng: number }[]) ?? [],
    cells: b.territoryCells.map((c) => ({
      id: c.id,
      code: c.code,
      coordinates: c.coordinates as { lat: number; lng: number }[],
      status: c.status,
      label: c.label,
      row: c.row,
      col: c.col,
      branchName: b.name,
      branchId: b.id,
    })),
  }));
}

export async function getTerritoryCells(
  branchId: string | null
): Promise<TerritoryCellWithCoords[]> {
  if (!branchId) return [];
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"] as Role[], "getTerritoryCells");
  if (!canAccessBranch(session, branchId)) return [];

  const cells = await prisma.territoryCell.findMany({
    where: { branchId },
    orderBy: [{ row: "asc" }, { col: "asc" }],
  });

  return cells.map((c) => ({
    id: c.id,
    code: c.code,
    coordinates: c.coordinates as { lat: number; lng: number }[],
    status: c.status,
    label: c.label,
    row: c.row,
    col: c.col,
  }));
}

const VALID_ZONE_STATUSES: ZoneStatus[] = [
  "UNSEEN", "SCOUTED", "CAPTURED", "FORTIFIED", "AT_RISK", "LOST",
];

export async function updateTerritoryCell(
  cellId: string,
  data: { status?: ZoneStatus; label?: string | null }
): Promise<void> {
  const session = await authorize(["BRANCH_MANAGER"] as Role[], "updateTerritoryCell");

  const cell = await prisma.territoryCell.findUnique({
    where: { id: cellId },
    select: { id: true, branchId: true },
  });
  if (!cell) throw new Error("Cell not found");
  if (!canAccessBranch(session, cell.branchId)) throw new Error("Access denied");

  const updateData: { status?: ZoneStatus; label?: string | null } = {};
  if (data.status !== undefined) {
    if (!VALID_ZONE_STATUSES.includes(data.status)) throw new Error("Invalid status");
    updateData.status = data.status;
  }
  if (data.label !== undefined) updateData.label = data.label;

  await prisma.territoryCell.update({
    where: { id: cellId },
    data: updateData,
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "TERRITORY_CELL_UPDATE", {
    entityType: "TerritoryCell",
    entityId: cellId,
    branchId: cell.branchId,
    metadata: updateData,
  });
}
