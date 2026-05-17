"use server";

import {
  createWorkOrder as createWorkOrderService,
  getDailyRollup as getDailyRollupService,
  getMyQueue as getMyQueueService,
  getOperatingPlanForBranch as getOperatingPlanService,
  getSquadDashboard as getSquadDashboardService,
  listBranchPlayers as listBranchPlayersService,
  listBranchWorkOrders as listBranchWorkOrdersService,
  updateBranchFieldBrief as updateBranchFieldBriefService,
  updateWorkOrderStatus as updateWorkOrderStatusService,
  upsertOperatingPlan as upsertOperatingPlanService,
  type CreateWorkOrderInput,
  type UpsertOperatingPlanInput,
} from "@/backend/services/field-operations-service";
import type { WorkOrderStatus } from "@prisma/client";

export async function getMyQueue() {
  return getMyQueueService();
}

export async function getSquadDashboard(branchId?: string | null) {
  return getSquadDashboardService(branchId ?? null);
}

export async function getOperatingPlan(branchId?: string | null) {
  return getOperatingPlanService(branchId ?? null);
}

export async function upsertOperatingPlan(input: UpsertOperatingPlanInput) {
  return upsertOperatingPlanService(input);
}

export async function createWorkOrder(input: CreateWorkOrderInput) {
  return createWorkOrderService(input);
}

export async function updateWorkOrderStatus(workOrderId: string, status: WorkOrderStatus) {
  return updateWorkOrderStatusService(workOrderId, status);
}

export async function listBranchWorkOrders(branchId?: string | null) {
  return listBranchWorkOrdersService(branchId ?? null);
}

export async function listBranchPlayers(branchId?: string | null) {
  return listBranchPlayersService(branchId ?? null);
}

export async function updateBranchFieldBrief(branchId: string | null, fieldBrief: string | null) {
  return updateBranchFieldBriefService(branchId, fieldBrief);
}

export async function getDailyRollup(branchId?: string | null) {
  return getDailyRollupService(branchId ?? null);
}
