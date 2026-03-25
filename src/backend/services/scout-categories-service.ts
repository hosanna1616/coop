import { authorize } from "@/lib/auth";
import * as activityLogService from "@/backend/services/activity-log-service";
import * as scoutCategoriesRepo from "@/backend/repositories/scout-categories-repository";
import { getUserById } from "@/backend/repositories/user-repository";

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

export async function getScoutCategories(): Promise<ScoutCategoryRow[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getScoutCategories");
  return scoutCategoriesRepo.listActiveScoutCategories();
}

export async function getScoutCategoriesForAdmin(): Promise<ScoutCategoryRow[]> {
  await authorize(["ADMIN"], "getScoutCategoriesForAdmin");
  return scoutCategoriesRepo.listAllScoutCategories();
}

export async function getScoutCategoryById(id: string): Promise<ScoutCategoryRow | null> {
  await authorize(["ADMIN"], "getScoutCategoryById");
  return scoutCategoriesRepo.findScoutCategoryById(id);
}

export async function createScoutCategory(data: CreateScoutCategoryData): Promise<ScoutCategoryRow> {
  const session = await authorize(["ADMIN"], "createScoutCategory");

  const name = data.name.trim();
  const displayName = data.displayName.trim();
  const iconName = data.iconName?.trim() || null;
  const displayOrder = data.displayOrder ?? 0;

  const existing = await scoutCategoriesRepo.findScoutCategoryByName(name);
  if (existing) throw new Error("A category with this name already exists.");

  const category = await scoutCategoriesRepo.createScoutCategory({
    name,
    displayName,
    iconName,
    displayOrder,
    active: true,
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "Admin", "SCOUT_CATEGORY_CREATE", {
    entityType: "ScoutCategory",
    entityId: category.id,
    metadata: { name: category.name, displayName: category.displayName },
  });

  return category;
}

export async function updateScoutCategory(
  id: string,
  data: UpdateScoutCategoryData
): Promise<ScoutCategoryRow> {
  const session = await authorize(["ADMIN"], "updateScoutCategory");

  const category = await scoutCategoriesRepo.updateScoutCategory(id, {
    ...(data.displayName !== undefined ? { displayName: data.displayName.trim() } : {}),
    ...(data.iconName !== undefined ? { iconName: data.iconName?.trim() || null } : {}),
    ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
  });

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "Admin", "SCOUT_CATEGORY_UPDATE", {
    entityType: "ScoutCategory",
    entityId: category.id,
    metadata: { name: category.name },
  });

  return category;
}

export async function deleteScoutCategory(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteScoutCategory");

  await scoutCategoriesRepo.deleteScoutCategory(id);

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "Admin", "SCOUT_CATEGORY_DELETE", {
    entityType: "ScoutCategory",
    entityId: id,
  });
}

