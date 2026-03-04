"use server";

import { prisma } from "@/lib/prisma";
import { rankFromXp } from "@/lib/rank";
import { revalidatePath } from "next/cache";
import { getServerAuthSession } from "@/lib/auth";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

const SCOUT_XP = 20;

async function getOrCreateDevUserId(): Promise<string> {
  const envId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  if (envId) {
    const u = await prisma.user.findUnique({ where: { id: envId } });
    if (u) return u.id;
  }
  let user = await prisma.user.findFirst();
  if (user) return user.id;
  user = await prisma.user.create({
    data: {
      name: "Dev Officer",
      rank: "CADET",
      xp: 0,
    },
  });
  return user.id;
}

export type ScoutZoneInput = {
  zoneCode: string;
  coordinates: Array<{ lat: number; lng: number }>;
  zoneId?: string | null;
  /** When provided, new zones are created with this branchId so they appear in branch territory. */
  branchId?: string | null;
  businessName: string;
  category: string;
  estimatedVolume: string; // "LOW" | "MEDIUM" | "HIGH" or free text
  locationLat: number;
  locationLng: number;
  photoUrl?: string | null;
  /** When provided, link this lead to the task (task must be assigned to current user). */
  missionTaskId?: string | null;
};

/** Alias for scoutZone - creates a lead from map/scout form. */
export async function createLead(input: ScoutZoneInput): Promise<{ ok: boolean; error?: string }> {
  return scoutZone(input);
}

export async function scoutZone(input: ScoutZoneInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await getServerAuthSession();
    const userId = session?.id ?? (await getOrCreateDevUserId());

    let zoneId = input.zoneId;
    if (!zoneId) {
      const zone = await prisma.zone.create({
        data: {
          code: input.zoneCode,
          coordinates: input.coordinates as object,
          status: "UNSEEN",
          ownerId: userId,
          ...(input.branchId && { branchId: input.branchId }),
        },
      });
      zoneId = zone.id;
    }

    let missionTaskId: string | null = null;
    if (input.missionTaskId && session?.id) {
      const ok = await canLinkLeadToTask(session.id, input.missionTaskId);
      if (ok) missionTaskId = input.missionTaskId;
    }

    const lead = await prisma.lead.create({
      data: {
        businessName: input.businessName,
        category: input.category,
        estimatedVolume: input.estimatedVolume,
        locationLat: input.locationLat,
        locationLng: input.locationLng,
        photoUrl: input.photoUrl ?? undefined,
        status: "NEW",
        zoneId,
        scoutedById: userId,
        ...(missionTaskId && { missionTaskId }),
      },
    });

    await prisma.zone.update({
      where: { id: zoneId },
      data: { status: "SCOUTED", ownerId: userId },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const newXp = user.xp + SCOUT_XP;
    const newRank = rankFromXp(newXp);
    await prisma.user.update({
      where: { id: userId },
      data: { xp: newXp, rank: newRank },
    });

    if (session) {
      const zone = await prisma.zone.findUnique({
        where: { id: zoneId },
        select: { branchId: true },
      });
      const actor = await prisma.user.findUnique({
        where: { id: session.id },
        select: { name: true },
      });
      await logActivity(session, actor?.name ?? "User", "LEAD_SCOUT", {
        entityType: "Lead",
        entityId: lead.id,
        branchId: zone?.branchId ?? null,
        metadata: { businessName: input.businessName, zoneCode: input.zoneCode },
      });
    }

    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("scoutZone error", e);
    return { ok: false, error: e instanceof Error ? e.message : "Scout failed" };
  }
}

/** Returns true if task exists, is assigned to userId, and status is PENDING or IN_PROGRESS. */
async function canLinkLeadToTask(userId: string, taskId: string): Promise<boolean> {
  const task = await prisma.missionTask.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, status: true },
  });
  return task?.assigneeId === userId && (task.status === "PENDING" || task.status === "IN_PROGRESS");
}

export type CreateLeadForTaskReportData = {
  missionTaskId: string;
  businessName: string;
  category: string;
  locationLat: number;
  locationLng: number;
  estimatedVolume?: string | null; // "LOW" | "MEDIUM" | "HIGH"
  taskReportType?: string | null; // SCOUTED | CAPTURED | FORTIFIED
  photoUrl?: string | null;
};

/** Create a lead as part of a task report. Creates a task zone if needed (zoneId required). */
export async function createLeadForTaskReport(
  data: CreateLeadForTaskReportData
): Promise<{ ok: boolean; error?: string; leadId?: string }> {
  try {
    const session = await authorize(["PLAYER"], "createLeadForTaskReport");
    const task = await prisma.missionTask.findUnique({
      where: { id: data.missionTaskId },
      include: { mission: { select: { branchId: true } } },
    });
    if (!task) return { ok: false, error: "Task not found" };
    if (task.assigneeId !== session.id) return { ok: false, error: "You can only add merchants to your own tasks." };
    if (task.status !== "PENDING" && task.status !== "IN_PROGRESS") {
      return { ok: false, error: "Task is not in a state that allows adding merchants." };
    }

    const taskZoneCode = `TASK-${data.missionTaskId}`;
    let zone = await prisma.zone.findUnique({ where: { code: taskZoneCode } });
    if (!zone) {
      zone = await prisma.zone.create({
        data: {
          code: taskZoneCode,
          coordinates: [],
          status: "UNSEEN",
          ownerId: session.id,
        },
      });
    }

    const lead = await prisma.lead.create({
      data: {
        businessName: data.businessName.trim(),
        category: data.category.trim(),
        estimatedVolume: data.estimatedVolume ?? "MEDIUM",
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        photoUrl: data.photoUrl ?? undefined,
        status: "NEW",
        zoneId: zone.id,
        scoutedById: session.id,
        missionTaskId: data.missionTaskId,
        taskReportType: data.taskReportType ?? undefined,
      },
    });

    const actor = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });
    await logActivity(session, actor?.name ?? "User", "LEAD_ADD_TO_TASK_REPORT", {
      entityType: "Lead",
      entityId: lead.id,
      branchId: task.mission.branchId ?? null,
      metadata: { missionTaskId: data.missionTaskId, businessName: lead.businessName },
    });

    revalidatePath("/missions");
    revalidatePath(`/missions/task/${data.missionTaskId}`);
    return { ok: true, leadId: lead.id };
  } catch (e) {
    console.error("createLeadForTaskReport error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to add merchant",
    };
  }
}
