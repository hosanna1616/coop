"use server";

import type { MissionTaskStatus } from "@prisma/client";
import * as missionService from "@/backend/services/mission-service";

/** Territory dashboard: zone and merchant counts for the home page. When branchId is set, counts are scoped to that branch. Uses TerritoryCell for zone stats so they match the map. */
export async function getTerritoryDashboardStats(branchId?: string | null): Promise<{
  zonesCaptured: number;
  zonesAtRisk: number;
  activeMerchants: number;
  activeMissions: number;
  totalZones: number;
}> {
  return missionService.getTerritoryDashboardStats(branchId);
}

export type CreateMissionData = {
  name: string;
  status?: string;
  branchId?: string | null;
  /** Branch from branches.json; resolved to branchId */
  branchCode?: string | null;
  /** Optional: scope mission to a territory cell (must belong to mission branch) */
  territoryCellId?: string | null;
};

export async function createMission(data: CreateMissionData) {
  return missionService.createMission(data);
}

/** List missions: admin only with branch filter, manager/player own branch only. No branch can see another branch's missions. */
export async function getMissions(filters?: { branchId?: string | null; limit?: number; offset?: number }) {
  return missionService.getMissions(filters);
}

/** Single mission by id (for edit page or read-only view). Manager/admin can edit; PLAYER can view (same branch). Branch-scoped. */
export async function getMissionById(missionId: string, branchIdFilter?: string | null) {
  return missionService.getMissionById(missionId, branchIdFilter);
}

/** Single task by id for assignee (or manager/admin for approval view). Returns task with mission, goals, and task-report leads. Branch-scoped for admin when branchId provided. */
export async function getTaskByIdForAssignee(taskId: string, branchIdFilter?: string | null) {
  return missionService.getTaskByIdForAssignee(taskId, branchIdFilter);
}

/** Task assigned to current user for a specific territory cell (for player map drawer). */
export async function getMyTaskForCell(territoryCellId: string) {
  return missionService.getMyTaskForCell(territoryCellId);
}

/** Missions and tasks assigned to current user (for staff "My tasks"). Only tasks from the user's branch. */
export async function getMyTasks() {
  return missionService.getMyTasks();
}

export type MyScoutedLead = {
  id: string;
  businessName: string;
  category: string;
  status: string;
  createdAt: Date;
  zoneCode: string | null;
};

export type MyInductedMerchant = {
  id: string;
  ownerName: string;
  citizenNumber: string;
  onboardingDate: Date;
  businessName: string;
  category: string;
};

/** Scouted leads and inducted merchants by the current user, scoped to their branch. For branch staff/players on the tasks screen. */
export async function getMyScoutedAndRegistered(): Promise<{
  scoutedLeads: MyScoutedLead[];
  inductedMerchants: MyInductedMerchant[];
}> {
  return missionService.getMyScoutedAndRegistered();
}

/** Pending task approvals. Branch manager: own branch. Admin: only the branch passed (no cross-branch). */
export async function getPendingTaskApprovals(filters?: { branchId?: string | null }) {
  return missionService.getPendingTaskApprovals(filters);
}

export type CreateMissionGoalData = {
  missionId: string;
  title: string;
  targetValue?: number | null;
  unit?: string | null;
  dueDate?: Date | string | null;
};

export async function createMissionGoal(data: CreateMissionGoalData) {
  return missionService.createMissionGoal(data);
}

export async function updateMissionGoal(
  goalId: string,
  data: { title?: string; targetValue?: number | null; unit?: string | null; dueDate?: Date | string | null }
) {
  return missionService.updateMissionGoal(goalId, data);
}

export async function deleteMissionGoal(goalId: string) {
  return missionService.deleteMissionGoal(goalId);
}

export type CreateMissionTaskData = {
  missionId: string;
  assigneeId: string;
  title: string;
  description?: string | null;
  /** Optional: task scoped to this territory cell (must belong to mission branch) */
  territoryCellId?: string | null;
};

export async function createMissionTask(data: CreateMissionTaskData) {
  return missionService.createMissionTask(data);
}

export async function updateMissionTaskStatus(
  taskId: string,
  status: MissionTaskStatus,
  options?: { completionNotes?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  return missionService.updateMissionTaskStatus(taskId, status, options);
}

