import { authorize } from "@/lib/auth";
import * as notificationsRepo from "@/backend/repositories/notifications-repository";

export type NotificationRow = notificationsRepo.NotificationRow;

export async function getMyNotifications(filters?: {
  onlyUnseen?: boolean;
  limit?: number;
  offset?: number;
}): Promise<NotificationRow[]> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMyNotifications");
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
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMyUnseenNotificationCount");
  return notificationsRepo.countUserUnseenNotifications(session.id);
}

export async function markNotificationSeen(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "markNotificationSeen");

  const row = await notificationsRepo.getNotificationForSeenUpdate(id);
  if (!row) return { ok: false, error: "Notification not found" };
  if (row.userId !== session.id) return { ok: false, error: "Unauthorized" };
  if (!row.seenAt) {
    await notificationsRepo.markNotificationSeen(id, new Date());
  }
  return { ok: true };
}

export async function markAllNotificationsSeen(): Promise<{ ok: boolean }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "markAllNotificationsSeen");
  await notificationsRepo.markAllUserNotificationsSeen(session.id, new Date());
  return { ok: true };
}

export async function createMissionAssignedNotifications(
  missionId: string,
  branchId: string,
  missionName: string
): Promise<void> {
  await notificationsRepo.createMissionAssignedNotifications({ missionId, branchId, missionName });
}

export async function createTaskAssignedNotification(
  taskId: string,
  assigneeId: string,
  missionName: string,
  taskTitle: string,
  branchId?: string | null
): Promise<void> {
  await notificationsRepo.createTaskAssignedNotification({
    taskId,
    assigneeId,
    missionName,
    taskTitle,
    branchId,
  });
}

