"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  missionId: string | null;
  missionTaskId: string | null;
  branchId: string | null;
  seenAt: Date | null;
  createdAt: Date;
};

export async function getMyNotifications(filters?: {
  onlyUnseen?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationRow[]> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMyNotifications");
  const limit = Math.min(Math.max(filters?.limit ?? 30, 1), 100);
  const offset = Math.max(filters?.offset ?? 0, 0);

  const list = await prisma.notification.findMany({
    where: {
      userId: session.id,
      ...(filters?.onlyUnseen ? { seenAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return list.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    missionId: n.missionId,
    missionTaskId: n.missionTaskId,
    branchId: n.branchId,
    seenAt: n.seenAt,
    createdAt: n.createdAt,
  }));
}

export async function getMyUnseenNotificationCount(): Promise<number> {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "getMyUnseenNotificationCount"
  );
  return prisma.notification.count({
    where: { userId: session.id, seenAt: null },
  });
}

export async function markNotificationSeen(id: string): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "markNotificationSeen");
  const row = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, seenAt: true },
  });
  if (!row) return { ok: false, error: "Notification not found" };
  if (row.userId !== session.id) return { ok: false, error: "Unauthorized" };
  if (!row.seenAt) {
    await prisma.notification.update({
      where: { id },
      data: { seenAt: new Date() },
    });
  }
  return { ok: true };
}

export async function markAllNotificationsSeen(): Promise<{ ok: boolean }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "markAllNotificationsSeen");
  await prisma.notification.updateMany({
    where: { userId: session.id, seenAt: null },
    data: { seenAt: new Date() },
  });
  return { ok: true };
}

export async function createMissionAssignedNotifications(
  missionId: string,
  branchId: string,
  missionName: string
): Promise<void> {
  const recipients = await prisma.user.findMany({
    where: {
      role: { in: ["PLAYER", "BRANCH_MANAGER"] },
      OR: [{ branchId: branchId }, { team: { branchId: branchId } }],
    },
    select: { id: true },
  });
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "MISSION_ASSIGNED_BRANCH",
      title: "New mission assigned",
      message: missionName,
      missionId,
      branchId,
    })),
  });
}

export async function createTaskAssignedNotification(
  taskId: string,
  assigneeId: string,
  missionName: string,
  taskTitle: string,
  branchId?: string | null
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `${missionName}: ${taskTitle}`,
      missionTaskId: taskId,
      branchId: branchId ?? null,
    },
  });
}
