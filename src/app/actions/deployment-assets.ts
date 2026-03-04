"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

export type CreateAssetData = {
  name: string;
  displayName: string;
  description: string;
  briefSteps?: string | null;
  link?: string | null;
  iconUrl?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "DEPRECATED";
};

export type UpdateAssetData = {
  displayName?: string;
  description?: string;
  briefSteps?: string | null;
  link?: string | null;
  iconUrl?: string | null;
  status?: "ACTIVE" | "INACTIVE" | "DEPRECATED";
};

export type DeploymentAssetRow = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  briefSteps: string | null;
  iconUrl: string | null;
  status: string;
  link: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Create a new deployment asset. ADMIN only. */
export async function createDeploymentAsset(data: CreateAssetData): Promise<DeploymentAssetRow> {
  const session = await authorize(["ADMIN"], "createDeploymentAsset");
  const name = data.name.trim().toUpperCase().replace(/\s+/g, "_");
  const asset = await prisma.deploymentAsset.create({
    data: {
      name,
      displayName: data.displayName.trim(),
      description: data.description.trim(),
      briefSteps: data.briefSteps?.trim() || null,
      link: data.link?.trim() || null,
      iconUrl: data.iconUrl?.trim() || null,
      status: data.status ?? "ACTIVE",
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "DEPLOYMENT_ASSET_CREATE", {
    entityType: "DeploymentAsset",
    entityId: asset.id,
    metadata: { name: asset.name, displayName: asset.displayName },
  });
  return {
    id: asset.id,
    name: asset.name,
    displayName: asset.displayName,
    description: asset.description,
    briefSteps: asset.briefSteps,
    iconUrl: asset.iconUrl,
    status: asset.status,
    link: asset.link,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/** Update an existing deployment asset. ADMIN only. */
export async function updateDeploymentAsset(
  id: string,
  data: UpdateAssetData
): Promise<DeploymentAssetRow> {
  const session = await authorize(["ADMIN"], "updateDeploymentAsset");
  const asset = await prisma.deploymentAsset.update({
    where: { id },
    data: {
      ...(data.displayName !== undefined && { displayName: data.displayName.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.briefSteps !== undefined && {
        briefSteps: data.briefSteps?.trim() || null,
      }),
      ...(data.link !== undefined && { link: data.link?.trim() || null }),
      ...(data.iconUrl !== undefined && { iconUrl: data.iconUrl?.trim() || null }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });
  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "DEPLOYMENT_ASSET_UPDATE", {
    entityType: "DeploymentAsset",
    entityId: asset.id,
    metadata: { name: asset.name, displayName: asset.displayName },
  });
  return {
    id: asset.id,
    name: asset.name,
    displayName: asset.displayName,
    description: asset.description,
    briefSteps: asset.briefSteps,
    iconUrl: asset.iconUrl,
    status: asset.status,
    link: asset.link,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}

/** Get all ACTIVE deployment assets. ADMIN, BRANCH_MANAGER, PLAYER. */
export async function getDeploymentAssets(): Promise<DeploymentAssetRow[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getDeploymentAssets");
  const assets = await prisma.deploymentAsset.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    displayName: a.displayName,
    description: a.description,
    briefSteps: a.briefSteps,
    iconUrl: a.iconUrl,
    status: a.status,
    link: a.link,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

/** Get all deployment assets for admin list (any status). ADMIN only. */
export async function getDeploymentAssetsForAdmin(): Promise<DeploymentAssetRow[]> {
  await authorize(["ADMIN"], "getDeploymentAssetsForAdmin");
  const assets = await prisma.deploymentAsset.findMany({
    orderBy: { name: "asc" },
  });
  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    displayName: a.displayName,
    description: a.description,
    briefSteps: a.briefSteps,
    iconUrl: a.iconUrl,
    status: a.status,
    link: a.link,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }));
}

/** Get a single deployment asset by id. ADMIN, BRANCH_MANAGER, PLAYER. */
export async function getDeploymentAssetById(id: string): Promise<DeploymentAssetRow | null> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getDeploymentAssetById");
  const asset = await prisma.deploymentAsset.findUnique({
    where: { id },
  });
  if (!asset) return null;
  return {
    id: asset.id,
    name: asset.name,
    displayName: asset.displayName,
    description: asset.description,
    briefSteps: asset.briefSteps,
    iconUrl: asset.iconUrl,
    status: asset.status,
    link: asset.link,
    createdAt: asset.createdAt,
    updatedAt: asset.updatedAt,
  };
}
