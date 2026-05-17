import { authorize, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  endOfWeekSunday,
  isWorkOrderOverdue,
  SLA_DEPLOYMENT_DAYS,
  SLA_LEAD_TO_INDUCT_DAYS,
  startOfWeekMonday,
  weekStartISO,
} from "@/lib/field-operations";
import type { WorkOrderObjective, WorkOrderStatus } from "@prisma/client";
import * as activityLogService from "@/backend/services/activity-log-service";
import { routeNotification } from "@/backend/services/notification-router-service";

function resolveBranchId(session: { role: Role; branchId: string | null }, branchId?: string | null) {
  if (session.role === "BRANCH_MANAGER") {
    if (!session.branchId) return null;
    return session.branchId;
  }
  if (session.role === "ADMIN") return branchId ?? null;
  return session.branchId;
}

async function getUserBranchId(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, team: { select: { branchId: true } } },
  });
  return u?.branchId ?? u?.team?.branchId ?? null;
}

export type WeekMetrics = {
  scouts: number;
  inductions: number;
  deployments: number;
};

async function getBranchWeekMetrics(branchId: string, weekStart: Date): Promise<WeekMetrics> {
  const weekEnd = endOfWeekSunday(weekStart);
  const [scouts, inductions, deployments] = await Promise.all([
    prisma.lead.count({
      where: {
        createdAt: { gte: weekStart, lte: weekEnd },
        OR: [
          { scoutedBy: { branchId } },
          { zone: { branchId } },
        ],
      },
    }),
    prisma.merchant.count({
      where: {
        onboardingDate: { gte: weekStart, lte: weekEnd },
        inductedBy: { branchId },
      },
    }),
    prisma.merchantDeploymentAsset.count({
      where: {
        onboardedAt: { gte: weekStart, lte: weekEnd },
        merchant: { inductedBy: { branchId } },
      },
    }),
  ]);
  return { scouts, inductions, deployments };
}

async function getUserWeekMetrics(userId: string, weekStart: Date): Promise<WeekMetrics> {
  const weekEnd = endOfWeekSunday(weekStart);
  const [scouts, inductions, deployments] = await Promise.all([
    prisma.lead.count({
      where: { scoutedById: userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.merchant.count({
      where: { inductedById: userId, onboardingDate: { gte: weekStart, lte: weekEnd } },
    }),
    prisma.merchantDeploymentAsset.count({
      where: {
        onboardedAt: { gte: weekStart, lte: weekEnd },
        merchant: { inductedById: userId },
      },
    }),
  ]);
  return { scouts, inductions, deployments };
}

export type OperatingPlanView = {
  weekStart: string;
  targetScouts: number;
  targetInductions: number;
  targetDeployments: number;
  notes: string | null;
  fieldBrief: string | null;
  branchMetrics: WeekMetrics;
  myMetrics: WeekMetrics | null;
};

export async function getOperatingPlanForBranch(branchId: string | null): Promise<OperatingPlanView | null> {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "getOperatingPlan");
  const resolved = resolveBranchId(session, branchId) ?? (session.role === "PLAYER" ? await getUserBranchId(session.id) : null);
  if (!resolved) return null;

  const weekStart = startOfWeekMonday();
  const plan = await prisma.branchOperatingPlan.findUnique({
    where: { branchId_weekStart: { branchId: resolved, weekStart } },
  });

  const [branchMetrics, branchRow, myMetrics] = await Promise.all([
    getBranchWeekMetrics(resolved, weekStart),
    prisma.branch.findUnique({
      where: { id: resolved },
      select: { fieldBrief: true },
    }),
    session.role === "PLAYER" ? getUserWeekMetrics(session.id, weekStart) : Promise.resolve(null),
  ]);

  const fieldBrief = branchRow?.fieldBrief ?? null;

  if (!plan) {
    return {
      weekStart: weekStartISO(),
      targetScouts: 0,
      targetInductions: 0,
      targetDeployments: 0,
      notes: null,
      fieldBrief,
      branchMetrics,
      myMetrics,
    };
  }

  return {
    weekStart: plan.weekStart.toISOString().slice(0, 10),
    targetScouts: plan.targetScouts,
    targetInductions: plan.targetInductions,
    targetDeployments: plan.targetDeployments,
    notes: plan.notes,
    fieldBrief,
    branchMetrics,
    myMetrics,
  };
}

export type UpsertOperatingPlanInput = {
  branchId?: string | null;
  weekStart?: string;
  targetScouts: number;
  targetInductions: number;
  targetDeployments: number;
  notes?: string | null;
};

export async function upsertOperatingPlan(input: UpsertOperatingPlanInput) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "upsertOperatingPlan");
  const branchId = resolveBranchId(session, input.branchId);
  if (!branchId) throw new Error("Branch is required.");

  const weekStart = input.weekStart
    ? new Date(input.weekStart + "T00:00:00.000Z")
    : startOfWeekMonday();

  const plan = await prisma.branchOperatingPlan.upsert({
    where: { branchId_weekStart: { branchId, weekStart } },
    create: {
      branchId,
      weekStart,
      targetScouts: Math.max(0, input.targetScouts),
      targetInductions: Math.max(0, input.targetInductions),
      targetDeployments: Math.max(0, input.targetDeployments),
      notes: input.notes ?? null,
      createdById: session.id,
    },
    update: {
      targetScouts: Math.max(0, input.targetScouts),
      targetInductions: Math.max(0, input.targetInductions),
      targetDeployments: Math.max(0, input.targetDeployments),
      notes: input.notes ?? null,
    },
  });

  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true } });
  await activityLogService.logActivity(session, actor?.name ?? "Manager", "OPERATING_PLAN_UPSERT", {
    branchId,
    entityType: "BranchOperatingPlan",
    entityId: plan.id,
    metadata: { weekStart: weekStartISO(weekStart) },
  });

  return plan;
}

export type CreateWorkOrderInput = {
  branchId?: string | null;
  assigneeId: string;
  title: string;
  description?: string | null;
  objective?: WorkOrderObjective;
  territoryCellId?: string | null;
  leadId?: string | null;
  dueAt: string;
};

export async function createWorkOrder(input: CreateWorkOrderInput) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "createWorkOrder");
  const branchId = resolveBranchId(session, input.branchId);
  if (!branchId) throw new Error("Branch is required.");

  const assignee = await prisma.user.findUnique({
    where: { id: input.assigneeId },
    select: { id: true, name: true, role: true, branchId: true, team: { select: { branchId: true } } },
  });
  if (!assignee || assignee.role !== "PLAYER") throw new Error("Assignee must be a field officer.");
  const assigneeBranch = assignee.branchId ?? assignee.team?.branchId;
  if (assigneeBranch !== branchId) throw new Error("Assignee must belong to this branch.");

  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) throw new Error("Invalid due date.");

  const order = await prisma.workOrder.create({
    data: {
      branchId,
      assigneeId: input.assigneeId,
      createdById: session.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      objective: input.objective ?? "GENERAL",
      territoryCellId: input.territoryCellId || null,
      leadId: input.leadId || null,
      dueAt,
    },
    include: {
      territoryCell: { select: { code: true } },
    },
  });

  await routeNotification({
    userId: input.assigneeId,
    type: "WORK_ORDER_ASSIGNED",
    title: "Work order assigned",
    message: `${order.title} — due ${dueAt.toLocaleDateString()}`,
    priority: "HIGH",
    actionUrl: "/work",
    branchId,
    metadata: { workOrderId: order.id, objective: order.objective },
  });

  const actor = await prisma.user.findUnique({ where: { id: session.id }, select: { name: true } });
  await activityLogService.logActivity(session, actor?.name ?? "Manager", "WORK_ORDER_CREATE", {
    branchId,
    entityType: "WorkOrder",
    entityId: order.id,
    metadata: { assigneeName: assignee.name, title: order.title },
  });

  return order;
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus
): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER", "ADMIN"], "updateWorkOrderStatus");
  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { assignee: { select: { name: true } } },
  });
  if (!order) return { ok: false, error: "Work order not found." };

  if (session.role === "PLAYER" && order.assigneeId !== session.id) {
    return { ok: false, error: "Not your work order." };
  }
  if (session.role === "BRANCH_MANAGER" && order.branchId !== session.branchId) {
    return { ok: false, error: "Access denied." };
  }

  if (status === "COMPLETED" && session.role === "PLAYER" && order.assigneeId !== session.id) {
    return { ok: false, error: "Access denied." };
  }

  await prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      status,
      completedAt: status === "COMPLETED" ? new Date() : null,
    },
  });

  return { ok: true };
}

export type QueueItem =
  | {
      kind: "work_order";
      id: string;
      title: string;
      objective: string;
      dueAt: string;
      overdue: boolean;
      status: string;
      cellCode: string | null;
    }
  | {
      kind: "mission_task";
      id: string;
      title: string;
      missionName: string;
      status: string;
      href: string;
    }
  | {
      kind: "sla_lead";
      id: string;
      businessName: string;
      daysSinceScout: number;
      href: string;
    }
  | {
      kind: "sla_deployment";
      id: string;
      businessName: string;
      daysSinceInduct: number;
      href: string;
    }
  | {
      kind: "daily_report";
      message: string;
      href: string;
    };

export type MyQueueResult = {
  branchId: string | null;
  fieldBrief: string | null;
  operatingPlan: OperatingPlanView | null;
  items: QueueItem[];
};

export async function getMyQueue(): Promise<MyQueueResult> {
  const session = await authorize(["PLAYER", "BRANCH_MANAGER"], "getMyQueue");
  const branchId = session.branchId ?? (await getUserBranchId(session.id));
  const items: QueueItem[] = [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const reportToday = await prisma.dailyReport.findUnique({
    where: {
      userId_reportDate: { userId: session.id, reportDate: today },
    },
  });
  if (!reportToday) {
    items.push({
      kind: "daily_report",
      message: "Submit today’s field report (plan + closeout).",
      href: "/report",
    });
  }

  const workOrders = await prisma.workOrder.findMany({
    where: {
      assigneeId: session.id,
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    orderBy: { dueAt: "asc" },
    include: { territoryCell: { select: { code: true } } },
  });

  for (const wo of workOrders) {
    items.push({
      kind: "work_order",
      id: wo.id,
      title: wo.title,
      objective: wo.objective,
      dueAt: wo.dueAt.toISOString(),
      overdue: isWorkOrderOverdue(wo.dueAt, wo.status),
      status: wo.status,
      cellCode: wo.territoryCell?.code ?? null,
    });
  }

  const tasks = await prisma.missionTask.findMany({
    where: {
      assigneeId: session.id,
      status: { in: ["PENDING", "IN_PROGRESS", "REJECTED"] },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { mission: { select: { name: true } } },
  });

  for (const t of tasks) {
    items.push({
      kind: "mission_task",
      id: t.id,
      title: t.title,
      missionName: t.mission.name,
      status: t.status,
      href: `/missions/task/${t.id}`,
    });
  }

  const leadCutoff = new Date();
  leadCutoff.setUTCDate(leadCutoff.getUTCDate() - SLA_LEAD_TO_INDUCT_DAYS);

  const staleLeads = await prisma.lead.findMany({
    where: {
      scoutedById: session.id,
      merchant: null,
      createdAt: { lte: leadCutoff },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  for (const lead of staleLeads) {
    const days = Math.floor((Date.now() - lead.createdAt.getTime()) / 86400000);
    items.push({
      kind: "sla_lead",
      id: lead.id,
      businessName: lead.businessName,
      daysSinceScout: days,
      href: `/induct/${lead.id}`,
    });
  }

  const deployCutoff = new Date();
  deployCutoff.setUTCDate(deployCutoff.getUTCDate() - SLA_DEPLOYMENT_DAYS);

  const merchantsNeedingDeploy = await prisma.merchant.findMany({
    where: {
      inductedById: session.id,
      onboardingDate: { lte: deployCutoff },
      deploymentAssets: { some: { onboardedAt: null } },
    },
    take: 10,
    include: { lead: { select: { businessName: true } } },
  });

  for (const m of merchantsNeedingDeploy) {
    const days = Math.floor((Date.now() - m.onboardingDate.getTime()) / 86400000);
    items.push({
      kind: "sla_deployment",
      id: m.id,
      businessName: m.lead?.businessName ?? m.ownerName,
      daysSinceInduct: days,
      href: `/merchants`,
    });
  }

  let fieldBrief: string | null = null;
  if (branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { fieldBrief: true },
    });
    fieldBrief = branch?.fieldBrief ?? null;
  }

  const operatingPlan = branchId ? await getOperatingPlanForBranch(branchId) : null;

  return { branchId, fieldBrief, operatingPlan, items };
}

export type SquadMemberRow = {
  userId: string;
  name: string;
  weekMetrics: WeekMetrics;
  lastActivityAt: string | null;
  reportFiledToday: boolean;
  openWorkOrders: number;
  overdueWorkOrders: number;
};

export type SquadDashboardResult = {
  branchId: string;
  branchName: string;
  operatingPlan: OperatingPlanView | null;
  members: SquadMemberRow[];
  escalations: {
    overdueWorkOrders: number;
    staleLeads: number;
    pendingTaskApprovals: number;
  };
  workOrders: Array<{
    id: string;
    title: string;
    assigneeName: string;
    dueAt: string;
    status: string;
    overdue: boolean;
  }>;
};

export async function getSquadDashboard(branchId?: string | null): Promise<SquadDashboardResult | null> {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "getSquadDashboard");
  const resolved = resolveBranchId(session, branchId);
  if (!resolved) return null;

  const branch = await prisma.branch.findUnique({
    where: { id: resolved },
    select: { name: true },
  });
  if (!branch) return null;

  const weekStart = startOfWeekMonday();
  const operatingPlan = await getOperatingPlanForBranch(resolved);

  const players = await prisma.user.findMany({
    where: { branchId: resolved, role: "PLAYER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const members: SquadMemberRow[] = [];
  for (const p of players) {
    const [weekMetrics, lastLog, reportToday, openWo, overdueWo] = await Promise.all([
      getUserWeekMetrics(p.id, weekStart),
      prisma.activityLog.findFirst({
        where: { userId: p.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.dailyReport.findUnique({
        where: { userId_reportDate: { userId: p.id, reportDate: today } },
        select: { id: true },
      }),
      prisma.workOrder.count({
        where: { assigneeId: p.id, status: { in: ["PENDING", "IN_PROGRESS"] } },
      }),
      prisma.workOrder.count({
        where: {
          assigneeId: p.id,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueAt: { lt: new Date() },
        },
      }),
    ]);

    members.push({
      userId: p.id,
      name: p.name,
      weekMetrics,
      lastActivityAt: lastLog?.createdAt.toISOString() ?? null,
      reportFiledToday: !!reportToday,
      openWorkOrders: openWo,
      overdueWorkOrders: overdueWo,
    });
  }

  const leadCutoff = new Date();
  leadCutoff.setUTCDate(leadCutoff.getUTCDate() - SLA_LEAD_TO_INDUCT_DAYS);

  const [staleLeads, pendingApprovals, openOrders] = await Promise.all([
    prisma.lead.count({
      where: {
        merchant: null,
        createdAt: { lte: leadCutoff },
        OR: [{ scoutedBy: { branchId: resolved } }, { zone: { branchId: resolved } }],
      },
    }),
    prisma.missionTask.count({
      where: { status: "SUBMITTED", mission: { branchId: resolved } },
    }),
    prisma.workOrder.findMany({
      where: { branchId: resolved, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: { dueAt: "asc" },
      take: 20,
      include: { assignee: { select: { name: true } } },
    }),
  ]);

  const overdueWorkOrders = openOrders.filter((o) => isWorkOrderOverdue(o.dueAt, o.status)).length;

  return {
    branchId: resolved,
    branchName: branch.name,
    operatingPlan,
    members,
    escalations: {
      overdueWorkOrders,
      staleLeads,
      pendingTaskApprovals: pendingApprovals,
    },
    workOrders: openOrders.map((o) => ({
      id: o.id,
      title: o.title,
      assigneeName: o.assignee.name,
      dueAt: o.dueAt.toISOString(),
      status: o.status,
      overdue: isWorkOrderOverdue(o.dueAt, o.status),
    })),
  };
}

export async function listBranchWorkOrders(branchId?: string | null) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "listBranchWorkOrders");
  const resolved = resolveBranchId(session, branchId);
  if (!resolved) return [];

  return prisma.workOrder.findMany({
    where: { branchId: resolved },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      assignee: { select: { id: true, name: true } },
      territoryCell: { select: { code: true } },
    },
  });
}

export async function listBranchPlayers(branchId?: string | null) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "listBranchPlayers");
  const resolved = resolveBranchId(session, branchId);
  if (!resolved) return [];

  return prisma.user.findMany({
    where: { branchId: resolved, role: "PLAYER" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function updateBranchFieldBrief(branchId: string | null, fieldBrief: string | null) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "updateBranchFieldBrief");
  const resolved = resolveBranchId(session, branchId);
  if (!resolved) throw new Error("Branch is required.");

  await prisma.branch.update({
    where: { id: resolved },
    data: { fieldBrief: fieldBrief?.trim() || null },
  });
}

export async function getDailyRollup(branchId?: string | null) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"], "getDailyRollup");
  const resolved = resolveBranchId(session, branchId);
  if (!resolved) return { reports: [], missingOfficers: [] as string[] };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [reports, players] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { branchId: resolved, reportDate: today },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { branchId: resolved, role: "PLAYER" },
      select: { id: true, name: true },
    }),
  ]);

  const submittedIds = new Set(reports.map((r) => r.userId));
  const missingOfficers = players.filter((p) => !submittedIds.has(p.id)).map((p) => p.name);

  return {
    reports: reports.map((r) => ({
      id: r.id,
      officerName: r.user.name,
      planNotes: r.planNotes,
      closeoutNotes: r.closeoutNotes,
      blockers: r.blockers,
      content: r.content,
    })),
    missingOfficers,
  };
}
