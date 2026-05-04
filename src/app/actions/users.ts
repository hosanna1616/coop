"use server";

import type { Role } from "@/lib/auth";
import { authorize, type AuthSession, hashPassword } from "@/lib/auth";
import type * as usersService from "@/backend/services/users-service";
import * as users from "@/backend/services/users-service";

export type CreateUserData = usersService.CreateUserData;
export type UpdateUserData = usersService.UpdateUserData;

export async function getCurrentUser(userId?: string | null) {
  return users.getCurrentUser(userId);
}

export async function getProfileStats(
  userId: string,
  options: { branchId?: string | null; role?: string }
) {
  return users.getProfileStats(userId, options);
}

export async function getLeaderboard(limit = 20, branchId?: string | null) {
  return users.getLeaderboard(limit, branchId);
}

export async function getLeaderboardForDashboard(
  limit: number,
  currentUserId: string,
  branchId?: string | null
) {
  return users.getLeaderboardForDashboard(limit, currentUserId, branchId);
}

export async function getUsersForAdmin(
  branchIdFilter?: string | null,
  options?: { limit?: number; offset?: number }
) {
  return users.getUsersForAdmin(branchIdFilter, options);
}

export async function createUser(data: CreateUserData) {
  return users.createUser(data);
}

export async function updateUserRole(userId: string, newRole: Role) {
  return users.updateUserRole(userId, newRole);
}

export async function updateUser(userId: string, data: UpdateUserData) {
  return users.updateUser(userId, data);
}

export async function updateMyDisplayName(name: string) {
  return users.updateMyDisplayName(name);
}

export async function resetUserPassword(userId: string, newPassword: string) {
  return users.resetUserPassword(userId, newPassword);
}

export async function getTeamsForAdmin(branchIdFilter?: string | null, options?: { limit?: number; offset?: number }) {
  return users.getTeamsForAdmin(branchIdFilter, options);
}

export async function getBranchesForAdmin() {
  return users.getBranchesForAdmin();
}

