import { prisma } from "@/lib/prisma";

export async function listActiveScoutCategories(): Promise<
  Array<{
    id: string;
    name: string;
    displayName: string;
    iconName: string | null;
    displayOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
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

export async function listAllScoutCategories(): Promise<
  Array<{
    id: string;
    name: string;
    displayName: string;
    iconName: string | null;
    displayOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
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

export async function findScoutCategoryById(id: string): Promise<{
  id: string;
  name: string;
  displayName: string;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null> {
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

export async function findScoutCategoryByName(name: string): Promise<{ id: string } | null> {
  const existing = await prisma.scoutCategory.findUnique({ where: { name } });
  return existing ? { id: existing.id } : null;
}

export async function createScoutCategory(params: {
  name: string;
  displayName: string;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
}): Promise<{
  id: string;
  name: string;
  displayName: string;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  const category = await prisma.scoutCategory.create({
    data: params,
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

export async function updateScoutCategory(
  id: string,
  params: Partial<{
    displayName: string;
    iconName: string | null;
    displayOrder: number;
    active: boolean;
  }>
): Promise<{
  id: string;
  name: string;
  displayName: string;
  iconName: string | null;
  displayOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  const category = await prisma.scoutCategory.update({
    where: { id },
    data: params,
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

export async function deleteScoutCategory(id: string): Promise<void> {
  await prisma.scoutCategory.delete({ where: { id } });
}

