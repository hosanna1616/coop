import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

export async function listUserNotifications(params: {
  userId: string;
  onlyUnseen?: boolean;
  limit: number;
  offset: number;
}): Promise<NotificationRow[]> {
  const list = await prisma.notification.findMany({
    where: {
      userId: params.userId,
      ...(params.onlyUnseen ? { seenAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: params.limit,
    skip: params.offset,
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

export async function countUserUnseenNotifications(
  userId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { userId, seenAt: null },
  });
}

export async function getNotificationForSeenUpdate(id: string): Promise<{
  id: string;
  userId: string;
  seenAt: Date | null;
} | null> {
  return prisma.notification.findUnique({
    where: { id },
    select: { id: true, userId: true, seenAt: true },
  });
}

export async function markNotificationSeen(
  id: string,
  seenAt: Date,
): Promise<void> {
  await prisma.notification.update({
    where: { id },
    data: { seenAt },
  });
}

export async function markAllUserNotificationsSeen(
  userId: string,
  seenAt: Date,
): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, seenAt: null },
    data: { seenAt },
  });
}

export async function createMissionAssignedNotifications(params: {
  missionId: string;
  branchId: string;
  missionName: string;
}): Promise<void> {
  const recipients = await prisma.user.findMany({
    where: {
      role: { in: ["PLAYER", "BRANCH_MANAGER"] },
      OR: [
        { branchId: params.branchId },
        { team: { branchId: params.branchId } },
      ],
    },
    select: { id: true },
  });
  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.id,
      type: "MISSION_ASSIGNED_BRANCH",
      title: "New mission assigned",
      message: params.missionName,
      missionId: params.missionId,
      branchId: params.branchId,
    })),
  });
}

export async function createTaskAssignedNotification(params: {
  taskId: string;
  assigneeId: string;
  missionName: string;
  taskTitle: string;
  branchId?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.assigneeId,
      type: "TASK_ASSIGNED",
      title: "New task assigned",
      message: `${params.missionName}: ${params.taskTitle}`,
      missionTaskId: params.taskId,
      branchId: params.branchId ?? null,
    },
  });
}

export async function hasHourlyFocusNotificationInCurrentHour(
  userId: string,
  now: Date,
): Promise<boolean> {
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  const hourEnd = new Date(hourStart);
  hourEnd.setHours(hourStart.getHours() + 1);
  const count = await prisma.notification.count({
    where: {
      userId,
      type: "HOURLY_PROGRESS_FOCUS",
      createdAt: { gte: hourStart, lt: hourEnd },
    },
  });
  return count > 0;
}

export async function createInAppNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      channel: "IN_APP",
      priority: params.priority ?? "NORMAL",
      metadata: params.metadata ?? {},
    },
  });
}
