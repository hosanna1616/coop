"use server";

import {
  createScoutCategory as createScoutCategoryService,
  deleteScoutCategory as deleteScoutCategoryService,
  getScoutCategories as getScoutCategoriesService,
  getScoutCategoriesForAdmin as getScoutCategoriesForAdminService,
  getScoutCategoryById as getScoutCategoryByIdService,
  updateScoutCategory as updateScoutCategoryService,
} from "@/backend/services/scout-categories-service";

export type ScoutCategoryRow = {
  id: string;
  name: string;
  displayName: string;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateScoutCategoryData = {
  name: string;
  displayName: string;
  iconName?: string | null;
  displayOrder?: number;
};

export type UpdateScoutCategoryData = {
  displayName?: string;
  iconName?: string | null;
  displayOrder?: number;
  active?: boolean;
};

/** Get active scout categories for scout form. All roles that can scout. */
export async function getScoutCategories(): Promise<ScoutCategoryRow[]> {
  return getScoutCategoriesService();
}

/** Get all scout categories for admin. ADMIN only. */
export async function getScoutCategoriesForAdmin(): Promise<ScoutCategoryRow[]> {
  return getScoutCategoriesForAdminService();
}

/** Get one scout category by id. ADMIN only. */
export async function getScoutCategoryById(id: string): Promise<ScoutCategoryRow | null> {
  return getScoutCategoryByIdService(id);
}

/** Create scout category. ADMIN only. */
export async function createScoutCategory(data: CreateScoutCategoryData): Promise<ScoutCategoryRow> {
  return createScoutCategoryService(data);
}

/** Update scout category. ADMIN only. */
export async function updateScoutCategory(
  id: string,
  data: UpdateScoutCategoryData
): Promise<ScoutCategoryRow> {
  return updateScoutCategoryService(id, data);
}

/** Delete scout category. ADMIN only. */
export async function deleteScoutCategory(id: string): Promise<void> {
  return deleteScoutCategoryService(id);
}
