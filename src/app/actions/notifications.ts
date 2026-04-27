"use server";

import {
  createMissionAssignedNotifications as createMissionAssignedNotificationsService,
  createTaskAssignedNotification as createTaskAssignedNotificationService,
  ensureHourlyProgressFocusNotification as ensureHourlyProgressFocusNotificationService,
  getMyNotifications as getMyNotificationsService,
  getMyUnseenNotificationCount as getMyUnseenNotificationCountService,
  markAllNotificationsSeen as markAllNotificationsSeenService,
  markNotificationSeen as markNotificationSeenService,
} from "@/backend/services/notifications-service";

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
  return getMyNotificationsService(filters);
}

export async function getMyUnseenNotificationCount(): Promise<number> {
  return getMyUnseenNotificationCountService();
}

export async function markNotificationSeen(id: string): Promise<{ ok: boolean; error?: string }> {
  return markNotificationSeenService(id);
}

export async function markAllNotificationsSeen(): Promise<{ ok: boolean }> {
  return markAllNotificationsSeenService();
}

export async function createMissionAssignedNotifications(
  missionId: string,
  branchId: string,
  missionName: string
): Promise<void> {
  return createMissionAssignedNotificationsService(missionId, branchId, missionName);
}

export async function createTaskAssignedNotification(
  taskId: string,
  assigneeId: string,
  missionName: string,
  taskTitle: string,
  branchId?: string | null
): Promise<void> {
  return createTaskAssignedNotificationService(taskId, assigneeId, missionName, taskTitle, branchId);
}

export async function ensureHourlyProgressFocusNotification(): Promise<{
  ok: boolean;
  created: boolean;
}> {
  return ensureHourlyProgressFocusNotificationService();
}
