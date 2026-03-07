"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

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
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getScoutCategories");
  const list = await prisma.scoutCategory.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    iconName: c.iconName,
    displayOrder: c.displayOrder,
    active: c.active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/** Get all scout categories for admin. ADMIN only. */
export async function getScoutCategoriesForAdmin(): Promise<ScoutCategoryRow[]> {
  await authorize(["ADMIN"], "getScoutCategoriesForAdmin");
  const list = await prisma.scoutCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });
  return list.map((c) => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    iconName: c.iconName,
    displayOrder: c.displayOrder,
    active: c.active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
}

/** Get one scout category by id. ADMIN only. */
export async function getScoutCategoryById(id: string): Promise<ScoutCategoryRow | null> {
  await authorize(["ADMIN"], "getScoutCategoryById");
  const c = await prisma.scoutCategory.findUnique({ where: { id } });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    iconName: c.iconName,
    displayOrder: c.displayOrder,
    active: c.active,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/** Create scout category. ADMIN only. */
export async function createScoutCategory(data: CreateScoutCategoryData): Promise<ScoutCategoryRow> {
  const session = await authorize(["ADMIN"], "createScoutCategory");
  const name = data.name.trim();
  const existing = await prisma.scoutCategory.findUnique({ where: { name } });
  if (existing) throw new Error("A category with this name already exists.");
  const category = await prisma.scoutCategory.create({
    data: {
      name,
      displayName: data.displayName.trim(),
      iconName: data.iconName?.trim() || null,
      displayOrder: data.displayOrder ?? 0,
      active: true,
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "SCOUT_CATEGORY_CREATE", {
    entityType: "ScoutCategory",
    entityId: category.id,
    metadata: { name: category.name, displayName: category.displayName },
  });
  return {
    id: category.id,
    name: category.name,
    displayName: category.displayName,
    iconName: category.iconName,
    displayOrder: category.displayOrder,
    active: category.active,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/** Update scout category. ADMIN only. */
export async function updateScoutCategory(
  id: string,
  data: UpdateScoutCategoryData
): Promise<ScoutCategoryRow> {
  const session = await authorize(["ADMIN"], "updateScoutCategory");
  const category = await prisma.scoutCategory.update({
    where: { id },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
      ...(data.iconName !== undefined && { iconName: data.iconName?.trim() || null }),
      ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "SCOUT_CATEGORY_UPDATE", {
    entityType: "ScoutCategory",
    entityId: category.id,
    metadata: { name: category.name },
  });
  return {
    id: category.id,
    name: category.name,
    displayName: category.displayName,
    iconName: category.iconName,
    displayOrder: category.displayOrder,
    active: category.active,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

/** Delete scout category. ADMIN only. */
export async function deleteScoutCategory(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteScoutCategory");
  await prisma.scoutCategory.delete({ where: { id } });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "SCOUT_CATEGORY_DELETE", {
    entityType: "ScoutCategory",
    entityId: id,
  });
}
