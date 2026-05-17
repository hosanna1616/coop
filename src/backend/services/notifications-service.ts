import { authorize } from "@/lib/auth";
import * as notificationsRepo from "@/backend/repositories/notifications-repository";
import { buildHourlyFocusPayload } from "@/backend/services/hourly-focus-message-service";
import { routeNotification } from "@/backend/services/notification-router-service";

export type NotificationRow = notificationsRepo.NotificationRow;

export async function getMyNotifications(filters?: {
  onlyUnseen?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationRow[]> {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "getMyNotifications",
  );
  const limit = Math.min(Math.max(filters?.limit ?? 30, 1), 100);
  const offset = Math.max(filters?.offset ?? 0, 0);
  return notificationsRepo.listUserNotifications({
    userId: session.id,
    onlyUnseen: filters?.onlyUnseen,
    limit,
    offset,
  });
}

export async function getMyUnseenNotificationCount(): Promise<number> {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "getMyUnseenNotificationCount",
  );
  return notificationsRepo.countUserUnseenNotifications(session.id);
}

export async function markNotificationSeen(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "markNotificationSeen",
  );

  const row = await notificationsRepo.getNotificationForSeenUpdate(id);
  if (!row) return { ok: false, error: "Notification not found" };
  if (row.userId !== session.id) return { ok: false, error: "Unauthorized" };
  if (!row.seenAt) {
    await notificationsRepo.markNotificationSeen(id, new Date());
  }
  return { ok: true };
}

export async function markAllNotificationsSeen(): Promise<{ ok: boolean }> {
  const session = await authorize(
    ["ADMIN", "BRANCH_MANAGER", "PLAYER"],
    "markAllNotificationsSeen",
  );
  await notificationsRepo.markAllUserNotificationsSeen(session.id, new Date());
  return { ok: true };
}

export async function createMissionAssignedNotifications(
  missionId: string,
  branchId: string,
  missionName: string,
): Promise<void> {
  await notificationsRepo.createMissionAssignedNotifications({
    missionId,
    branchId,
    missionName,
  });
}

export async function createTaskAssignedNotification(
  taskId: string,
  assigneeId: string,
  missionName: string,
  taskTitle: string,
  branchId?: string | null,
): Promise<void> {
  await notificationsRepo.createTaskAssignedNotification({
    taskId,
    assigneeId,
    missionName,
    taskTitle,
    branchId,
  });
}

export async function ensureHourlyProgressFocusNotification(): Promise<{
  ok: boolean;
  created: boolean;
}> {
  const session = await authorize(
    ["PLAYER", "BRANCH_MANAGER", "ADMIN"],
    "ensureHourlyProgressFocusNotification",
  );
  if (session.role !== "PLAYER") return { ok: true, created: false };

  const now = new Date();
  const alreadyCreated =
    await notificationsRepo.hasHourlyFocusNotificationInCurrentHour(
      session.id,
      now,
      "IN_APP",
    );
  if (alreadyCreated) return { ok: true, created: false };

  const { title, message, metadata } = await buildHourlyFocusPayload(
    session.id,
    now,
  );

  await routeNotification({
    userId: session.id,
    type: "HOURLY_PROGRESS_FOCUS",
    title,
    message,
    priority: "HIGH",
    metadata,
    actionUrl: "/report",
  });
  return { ok: true, created: true };
}
