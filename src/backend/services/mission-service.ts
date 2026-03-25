import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { getCurrentUser } from "@/app/actions/users";
import { logActivity } from "@/backend/services/activity-log-service";
import {
  createMissionAssignedNotifications,
  createTaskAssignedNotification,
} from "@/backend/services/notifications-service";
import type { MissionTaskStatus } from "@prisma/client";

/** Territory dashboard: zone and merchant counts for the home page. When branchId is set, counts are scoped to that branch. Uses TerritoryCell for zone stats so they match the map. */
export async function getTerritoryDashboardStats(branchId?: string | null): Promise<{
  zonesCaptured: number;
  zonesAtRisk: number;
  activeMerchants: number;
  activeMissions: number;
  totalZones: number;
}> {
  try {
    const cellWhere = branchId ? { branchId } : {};
    const missionWhere = branchId
      ? { branchId, status: { not: "DRAFT" } }
      : { status: { not: "DRAFT" } };
    const merchantWhere = branchId
      ? { lead: { zone: { branchId } } }
      : undefined;

    const [zonesCaptured, zonesAtRisk, activeMerchants, activeMissions, totalZones] = await Promise.all([
      prisma.territoryCell.count({ where: { ...cellWhere, status: "CAPTURED" } }),
      prisma.territoryCell.count({ where: { ...cellWhere, status: "AT_RISK" } }),
      merchantWhere ? prisma.merchant.count({ where: merchantWhere }) : prisma.merchant.count(),
      prisma.mission.count({ where: missionWhere }),
      prisma.territoryCell.count({ where: cellWhere }),
    ]);
    return { zonesCaptured, zonesAtRisk, activeMerchants, activeMissions, totalZones };
  } catch {
    return { zonesCaptured: 0, zonesAtRisk: 0, activeMerchants: 0, activeMissions: 0, totalZones: 0 };
  }
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
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "createMission");
  let branchId: string | null = data.branchId ?? null;
  if (!branchId && data.branchCode) {
    const branch = await prisma.branch.findUnique({
      where: { branchCode: data.branchCode },
      select: { id: true },
    });
    branchId = branch?.id ?? null;
  }
  if (session.role === "BRANCH_MANAGER") {
    if (!session.branchId) throw new Error("Branch manager has no branch assigned.");
    branchId = session.branchId;
  }
  if (data.territoryCellId && branchId) {
    const cell = await prisma.territoryCell.findUnique({
      where: { id: data.territoryCellId },
      select: { branchId: true },
    });
    if (!cell || cell.branchId !== branchId) {
      throw new Error("Territory cell must belong to the mission branch.");
    }
  }
  const mission = await prisma.mission.create({
    data: {
      name: data.name,
      status: data.status ?? "DRAFT",
      branchId: branchId ?? undefined,
      territoryCellId: data.territoryCellId ?? undefined,
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  if (mission.branchId) {
    await createMissionAssignedNotifications(mission.id, mission.branchId, mission.name);
  }
  await logActivity(session, actor?.name ?? "User", "MISSION_CREATE", {
    entityType: "Mission",
    entityId: mission.id,
    branchId: mission.branchId ?? null,
    metadata: { name: mission.name },
  });
  return mission;
}

/** List missions: admin only with branch filter, manager/player own branch only. No branch can see another branch's missions. */
export async function getMissions(filters?: { branchId?: string | null; limit?: number; offset?: number }) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMissions");
  let branchId: string | null = filters?.branchId ?? null;
  if (session.role === "BRANCH_MANAGER" || session.role === "PLAYER") {
    const user = await getCurrentUser(session.id);
    branchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
  }
  // ADMIN must specify a branch to see missions; no cross-branch listing
  if (session.role === "ADMIN" && !branchId) {
    return { missions: [], total: 0 };
  }
  if (!branchId) {
    return { missions: [], total: 0 };
  }
  const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 100);
  const offset = Math.max(filters?.offset ?? 0, 0);
  try {
    const where = { branchId };
    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          goals: true,
          territoryCell: { select: { id: true, code: true } },
          tasks: {
            include: {
              assignee: { select: { id: true, name: true } },
              territoryCell: { select: { id: true, code: true } },
            },
          },
        },
      }),
      prisma.mission.count({ where }),
    ]);
    return { missions, total };
  } catch {
    return { missions: [], total: 0 };
  }
}

/** Single mission by id (for edit page or read-only view). Manager/admin can edit; PLAYER can view (same branch). Branch-scoped. */
export async function getMissionById(missionId: string, branchIdFilter?: string | null) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMissionById");
  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: {
      goals: true,
      tasks: { include: { assignee: { select: { id: true, name: true } }, territoryCell: { select: { id: true, code: true } } } },
      branch: { select: { id: true, name: true } },
      territoryCell: { select: { id: true, code: true } },
    },
  });
  if (!mission) return null;
  if (session.role === "PLAYER") {
    if (mission.branchId !== session.branchId) return null;
    return mission;
  }
  if (session.role === "BRANCH_MANAGER" && mission.branchId !== session.branchId) return null;
  if (session.role === "ADMIN" && branchIdFilter != null && mission.branchId !== branchIdFilter) return null;
  return mission;
}

/** Single task by id for assignee (or manager/admin for approval view). Returns task with mission, goals, and task-report leads. Branch-scoped for admin when branchId provided. */
export async function getTaskByIdForAssignee(taskId: string, branchIdFilter?: string | null) {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "getTaskByIdForAssignee");
  const task = await prisma.missionTask.findUnique({
    where: { id: taskId },
    include: {
      mission: { select: { id: true, name: true, status: true, branchId: true, goals: true } },
      assignee: { select: { id: true, name: true } },
      territoryCell: { select: { id: true, code: true } },
      taskReportLeads: {
        select: {
          id: true,
          businessName: true,
          category: true,
          locationLat: true,
          locationLng: true,
          taskReportType: true,
        },
      },
    },
  });
  if (!task) return null;
  if (session.role === "PLAYER") {
    if (task.assigneeId !== session.id) return null;
  } else if (session.role === "BRANCH_MANAGER") {
    if (task.mission.branchId !== session.branchId) return null;
  } else if (session.role === "ADMIN" && branchIdFilter != null) {
    if (task.mission.branchId !== branchIdFilter) return null;
  }
  return task;
}

/** Task assigned to current user for a specific territory cell (for player map drawer). */
export async function getMyTaskForCell(territoryCellId: string) {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "getMyTaskForCell");
  const task = await prisma.missionTask.findFirst({
    where: {
      assigneeId: session.id,
      territoryCellId,
    },
    orderBy: { createdAt: "desc" },
    include: {
      mission: { select: { id: true, name: true } },
      territoryCell: { select: { id: true, code: true } },
    },
  });
  return task;
}

/** Missions and tasks assigned to current user (for staff "My tasks"). Only tasks from the user's branch. */
export async function getMyTasks() {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "getMyTasks");
  if (typeof (prisma as { missionTask?: { findMany: unknown } }).missionTask?.findMany !== "function") {
    return [];
  }
  // Resolve branch: session (from JWT) or user's branch/team from DB (players may only have team.branchId)
  let branchId = session.branchId;
  if (!branchId && (session.role === "PLAYER" || session.role === "BRANCH_MANAGER")) {
    const user = await getCurrentUser(session.id);
    branchId = user?.branchId ?? user?.team?.branchId ?? null;
  }
  if (!branchId) return [];
  const tasks = await prisma.missionTask.findMany({
    where: {
      assigneeId: session.id,
      mission: { branchId },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      mission: { select: { id: true, name: true, status: true } },
      territoryCell: { select: { id: true, code: true } },
    },
  });
  return tasks;
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
  const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "getMyScoutedAndRegistered");
  const user = await getCurrentUser(session.id);
  const branchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
  if (!branchId) return { scoutedLeads: [], inductedMerchants: [] };

  const [leads, merchants] = await Promise.all([
    prisma.lead.findMany({
      where: {
        scoutedById: session.id,
        status: { not: "CONVERTED" },
        OR: [
          { scoutedBy: { branchId } },
          { zone: { branchId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        businessName: true,
        category: true,
        status: true,
        createdAt: true,
        zone: { select: { code: true } },
      },
    }),
    prisma.merchant.findMany({
      where: {
        inductedById: session.id,
        OR: [
          { inductedBy: { branchId } },
          { lead: { zone: { branchId } } },
        ],
      },
      orderBy: { onboardingDate: "desc" },
      take: 100,
      select: {
        id: true,
        ownerName: true,
        citizenNumber: true,
        onboardingDate: true,
        lead: { select: { businessName: true, category: true } },
      },
    }),
  ]);

  return {
    scoutedLeads: leads.map((l) => ({
      id: l.id,
      businessName: l.businessName,
      category: l.category,
      status: l.status,
      createdAt: l.createdAt,
      zoneCode: l.zone?.code ?? null,
    })),
    inductedMerchants: merchants.map((m) => ({
      id: m.id,
      ownerName: m.ownerName,
      citizenNumber: m.citizenNumber,
      onboardingDate: m.onboardingDate,
      businessName: m.lead?.businessName ?? "",
      category: m.lead?.category ?? "",
    })),
  };
}

/** Pending task approvals. Branch manager: own branch. Admin: only the branch passed (no cross-branch). */
export async function getPendingTaskApprovals(filters?: { branchId?: string | null }) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "getPendingTaskApprovals");
  if (typeof (prisma as { missionTask?: { findMany: unknown } }).missionTask?.findMany !== "function") {
    return [];
  }
  let branchId: string | null = session.branchId ?? null;
  if (session.role === "ADMIN") {
    branchId = filters?.branchId ?? null;
    if (!branchId) return [];
  }
  const tasks = await prisma.missionTask.findMany({
    where: {
      status: "SUBMITTED",
      mission: { branchId },
    },
    orderBy: { completedAt: "desc" },
    take: 50,
    include: {
      mission: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      territoryCell: { select: { id: true, code: true } },
    },
  });
  return tasks;
}

export type CreateMissionGoalData = {
  missionId: string;
  title: string;
  targetValue?: number | null;
  unit?: string | null;
  dueDate?: Date | string | null;
};

export async function createMissionGoal(data: CreateMissionGoalData) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "createMissionGoal");
  const mission = await prisma.mission.findUnique({
    where: { id: data.missionId },
    select: { branchId: true },
  });
  if (!mission) throw new Error("Mission not found");
  if (session.role === "BRANCH_MANAGER" && mission.branchId !== session.branchId) {
    throw new Error("You can only add goals to missions in your branch.");
  }
  const goal = await prisma.missionGoal.create({
    data: {
      missionId: data.missionId,
      title: data.title,
      targetValue: data.targetValue ?? undefined,
      unit: data.unit ?? undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "MISSION_GOAL_CREATE", {
    entityType: "MissionGoal",
    entityId: goal.id,
    branchId: mission.branchId,
    metadata: { missionId: data.missionId, title: goal.title },
  });
  return goal;
}

export async function updateMissionGoal(
  goalId: string,
  data: { title?: string; targetValue?: number | null; unit?: string | null; dueDate?: Date | string | null }
) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "updateMissionGoal");
  const goal = await prisma.missionGoal.findUnique({
    where: { id: goalId },
    include: { mission: { select: { branchId: true } } },
  });
  if (!goal) throw new Error("Goal not found");
  if (session.role === "BRANCH_MANAGER" && goal.mission.branchId !== session.branchId) {
    throw new Error("You can only edit goals of missions in your branch.");
  }
  await prisma.missionGoal.update({
    where: { id: goalId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.targetValue !== undefined && { targetValue: data.targetValue }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "MISSION_GOAL_UPDATE", {
    entityType: "MissionGoal",
    entityId: goalId,
    branchId: goal.mission.branchId,
    metadata: data,
  });
}

export async function deleteMissionGoal(goalId: string) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "deleteMissionGoal");
  const goal = await prisma.missionGoal.findUnique({
    where: { id: goalId },
    include: { mission: { select: { branchId: true } } },
  });
  if (!goal) throw new Error("Goal not found");
  if (session.role === "BRANCH_MANAGER" && goal.mission.branchId !== session.branchId) {
    throw new Error("You can only delete goals of missions in your branch.");
  }
  await prisma.missionGoal.delete({ where: { id: goalId } });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "MISSION_GOAL_DELETE", {
    entityType: "MissionGoal",
    entityId: goalId,
    branchId: goal.mission.branchId,
  });
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
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"], "createMissionTask");
  const mission = await prisma.mission.findUnique({
    where: { id: data.missionId },
    select: { branchId: true, name: true },
  });
  if (!mission) throw new Error("Mission not found");
  if (session.role === "BRANCH_MANAGER" && mission.branchId !== session.branchId) {
    throw new Error("You can only add tasks to missions in your branch.");
  }
  const assignee = await prisma.user.findUnique({
    where: { id: data.assigneeId },
    select: { branchId: true, team: { select: { branchId: true } }, name: true, role: true },
  });
  if (!assignee) throw new Error("Assignee not found");
  if (assignee.role === "ADMIN") throw new Error("Admins cannot be assigned tasks.");
  const assigneeBranchId = assignee.branchId ?? assignee.team?.branchId ?? null;
  if (mission.branchId && assigneeBranchId !== mission.branchId) {
    throw new Error("Assignee must belong to the mission branch.");
  }
  if (session.role === "BRANCH_MANAGER" && assignee.role !== "PLAYER") {
    throw new Error("You can only assign tasks to branch staff.");
  }
  if (data.territoryCellId && mission.branchId) {
    const cell = await prisma.territoryCell.findUnique({
      where: { id: data.territoryCellId },
      select: { branchId: true },
    });
    if (!cell || cell.branchId !== mission.branchId) {
      throw new Error("Territory cell must belong to the mission branch.");
    }
  }
  const task = await prisma.missionTask.create({
    data: {
      missionId: data.missionId,
      assigneeId: data.assigneeId,
      title: data.title,
      description: data.description ?? undefined,
      territoryCellId: data.territoryCellId ?? undefined,
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await createTaskAssignedNotification(
    task.id,
    data.assigneeId,
    mission.name,
    task.title,
    mission.branchId
  );
  await logActivity(session, actor?.name ?? "User", "MISSION_TASK_ASSIGN", {
    entityType: "MissionTask",
    entityId: task.id,
    branchId: mission.branchId,
    metadata: { missionId: data.missionId, assigneeName: assignee.name, title: task.title },
  });
  return task;
}

export async function updateMissionTaskStatus(
  taskId: string,
  status: MissionTaskStatus,
  options?: { completionNotes?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "updateMissionTaskStatus");
  const task = await prisma.missionTask.findUnique({
    where: { id: taskId },
    include: { mission: { select: { branchId: true } }, assignee: { select: { name: true } } },
  });
  if (!task) return { ok: false, error: "Task not found" };

  if (session.role === "PLAYER") {
    if (task.assigneeId !== session.id) return { ok: false, error: "You can only update your own tasks." };
    if (status !== "IN_PROGRESS" && status !== "SUBMITTED") {
      return { ok: false, error: "Staff can only set status to In progress or Submitted." };
    }
  } else {
    if (status !== "APPROVED" && status !== "REJECTED") {
      return { ok: false, error: "Managers can only approve or reject submitted tasks." };
    }
    if (task.status !== "SUBMITTED") {
      return { ok: false, error: "Only submitted tasks can be approved or rejected." };
    }
    if (session.role === "BRANCH_MANAGER" && task.mission.branchId !== session.branchId) {
      return { ok: false, error: "You can only approve tasks in your branch." };
    }
  }

  const updateData: {
    status: MissionTaskStatus;
    completedAt?: Date;
    approvedById?: string;
    approvedAt?: Date;
    completionNotes?: string | null;
  } = { status };
  if (status === "SUBMITTED") {
    updateData.completedAt = new Date();
    if (options?.completionNotes !== undefined) updateData.completionNotes = options.completionNotes ?? null;
  }
  if (status === "APPROVED" || status === "REJECTED") {
    updateData.approvedById = session.id;
    updateData.approvedAt = new Date();
  }

  await prisma.missionTask.update({
    where: { id: taskId },
    data: updateData,
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "User", "MISSION_TASK_UPDATE_STATUS", {
    entityType: "MissionTask",
    entityId: taskId,
    branchId: task.mission.branchId,
    metadata: { previousStatus: task.status, newStatus: status, assigneeName: task.assignee.name },
  });
  return { ok: true };
}

