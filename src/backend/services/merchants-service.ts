import { prisma } from "@/lib/prisma";
import { rankFromXp } from "@/lib/rank";
import { revalidatePath } from "next/cache";
import { getServerAuthSession, authorize } from "@/lib/auth";
import { getCurrentUser } from "@/backend/services/users-service";
import { getRanks } from "@/backend/services/ranks-service";
import { logActivity } from "@/backend/services/activity-log-service";

const XP_INDUCT = 100;
const XP_CAPTURE_ZONE = 500;
const ZONE_CAPTURE_THRESHOLD = 10;

async function getOrCreateDevUserId(): Promise<string> {
  const envId = process.env.NEXT_PUBLIC_DEV_USER_ID;
  if (envId) {
    const u = await prisma.user.findUnique({ where: { id: envId } });
    if (u) return u.id;
  }

  let user = await prisma.user.findFirst();
  if (user) return user.id;

  const defaultRank = await prisma.rank.findFirst({
    orderBy: { displayOrder: "asc" },
    select: { code: true },
  });

  user = await prisma.user.create({
    data: { name: "Dev Officer", rank: defaultRank?.code ?? "CADET", xp: 0 },
  });

  return user.id;
}

function generateCitizenNumber(): string {
  return "MN-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8);
}

export type UpdateMerchantKYCInput = {
  leadId: string;
  ownerName: string;
  nationalIdNumber?: string;
  tradeLicenseNumber?: string;
  tinNumber?: string;
  phoneNumber: string;
  merchantAccountNumber?: string;
};

/** Step 2: Create or update Merchant with KYC and product flags. */
export async function updateMerchantProductsAndKYC(
  input: UpdateMerchantKYCInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "updateMerchantProductsAndKYC");
    const userId = session.id;

    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: { merchant: true },
    });
    if (!lead) return { ok: false, error: "Lead not found" };
    if (lead.status === "CONVERTED") return { ok: false, error: "Lead already converted" };

    const placeholderSignature = "";
    const citizenNumber = lead.merchant?.citizenNumber ?? "MN-PENDING-" + lead.id.slice(0, 8);

    if (lead.merchant) {
      await prisma.merchant.update({
        where: { id: lead.merchant.id },
        data: {
          ownerName: input.ownerName.trim(),
          nationalIdNumber: input.nationalIdNumber?.trim() ?? null,
          tradeLicenseNumber: input.tradeLicenseNumber?.trim() ?? null,
          tinNumber: input.tinNumber?.trim() ?? null,
          phoneNumber: input.phoneNumber.trim(),
          merchantAccountNumber: input.merchantAccountNumber?.trim() ?? "",
          inductedById: userId,
        },
      });
    } else {
      await prisma.merchant.create({
        data: {
          leadId: input.leadId,
          ownerName: input.ownerName.trim(),
          nationalIdNumber: input.nationalIdNumber?.trim() ?? null,
          tradeLicenseNumber: input.tradeLicenseNumber?.trim() ?? null,
          tinNumber: input.tinNumber?.trim() ?? null,
          phoneNumber: input.phoneNumber.trim(),
          merchantAccountNumber: input.merchantAccountNumber?.trim() ?? "",
          oathSignatureUrl: placeholderSignature,
          citizenNumber,
          inductedById: userId,
        },
      });
    }

    revalidatePath("/");
    revalidatePath(`/induct/${input.leadId}`);
    return { ok: true };
  } catch (e) {
    console.error("updateMerchantProductsAndKYC error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save KYC",
    };
  }
}

export type CompleteInductionInput = {
  leadId: string;
  oathSignatureUrl: string;
};

/** Step 3: Finalize induction – set signature, assign citizen number, mark lead converted, update zone. */
export async function completeInduction(
  input: CompleteInductionInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "completeInduction");
    const userId = session.id;

    const lead = await prisma.lead.findUnique({
      where: { id: input.leadId },
      include: { merchant: true, zone: true },
    });
    if (!lead) return { ok: false, error: "Lead not found" };
    if (lead.status === "CONVERTED") return { ok: false, error: "Lead already converted" };
    if (!lead.merchant) return { ok: false, error: "Complete KYC step first" };

    const citizenNumber =
      lead.merchant.citizenNumber.startsWith("MN-PENDING-")
        ? generateCitizenNumber()
        : lead.merchant.citizenNumber;

    await prisma.merchant.update({
      where: { id: lead.merchant.id },
      data: {
        oathSignatureUrl: input.oathSignatureUrl || lead.merchant.oathSignatureUrl,
        citizenNumber,
      },
    });

    // Deployment assets are offered only after registration (see Merchants list / edit merchant).

    await prisma.lead.update({
      where: { id: input.leadId },
      data: { status: "CONVERTED" },
    });

    const merchantCount = await prisma.merchant.count({
      where: {
        lead: { zoneId: lead.zoneId },
      },
    });
    if (lead.zoneId && merchantCount >= ZONE_CAPTURE_THRESHOLD) {
      await prisma.zone.update({
        where: { id: lead.zoneId },
        data: { status: "CAPTURED" },
      });
    }

    const xpToAdd = XP_INDUCT + (merchantCount >= ZONE_CAPTURE_THRESHOLD ? XP_CAPTURE_ZONE : 0);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const ranks = await getRanks();
    const newRank = rankFromXp(ranks, user.xp + xpToAdd);
    await prisma.user.update({
      where: { id: userId },
      data: { xp: user.xp + xpToAdd, rank: newRank },
    });

    if (session) {
      const zone = lead.zoneId
        ? await prisma.zone.findUnique({
            where: { id: lead.zoneId },
            select: { branchId: true },
          })
        : null;

      const actor = await prisma.user.findUnique({
        where: { id: session.id },
        select: { name: true },
      });

      await logActivity(session, actor?.name ?? "User", "MERCHANT_INDUCT", {
        entityType: "Merchant",
        entityId: lead.merchant.id,
        branchId: zone?.branchId ?? null,
        metadata: { leadId: input.leadId, citizenNumber },
      });
    }

    revalidatePath("/");
    revalidatePath(`/induct/${input.leadId}`);
    return { ok: true };
  } catch (e) {
    console.error("completeInduction error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Induction failed",
    };
  }
}

export type InductMerchantInput = {
  leadId: string;
  ownerName: string;
  nationalIdNumber?: string;
  tradeLicenseNumber?: string;
  tinNumber?: string;
  phoneNumber: string;
  merchantAccountNumber?: string;
  oathSignatureUrl?: string;
};

/** One-shot induction (creates Merchant and completes in one go). Used by legacy wizard. */
export async function inductMerchant(
  input: InductMerchantInput
): Promise<{ ok: boolean; error?: string }> {
  const kyc = await updateMerchantProductsAndKYC({
    leadId: input.leadId,
    ownerName: input.ownerName,
    nationalIdNumber: input.nationalIdNumber,
    tradeLicenseNumber: input.tradeLicenseNumber,
    tinNumber: input.tinNumber,
    phoneNumber: input.phoneNumber,
    merchantAccountNumber: input.merchantAccountNumber,
  });
  if (!kyc.ok) return kyc;
  return completeInduction({
    leadId: input.leadId,
    oathSignatureUrl: input.oathSignatureUrl ?? "",
  });
}

export type MerchantsByBranchFilters = {
  branchId: string | null;
  limit?: number;
  offset?: number;
};

/** Registered merchants by branch. Player/branch manager: their branch only. Admin: optional branchId (null = all). */
export async function getMerchantsByBranch(filters: MerchantsByBranchFilters): Promise<{
  merchants: {
    id: string;
    ownerName: string;
    citizenNumber: string;
    phoneNumber: string;
    onboardingDate: Date;
    inductedBy: { id: string; name: string };
    branchName: string | null;
    lead: { businessName: string; category: string } | null;
  }[];
  total: number;
}> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMerchantsByBranch");
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  let branchId: string | null = filters.branchId ?? null;
  if (session.role === "BRANCH_MANAGER" || session.role === "PLAYER") {
    const user = await getCurrentUser(session.id);
    const effectiveBranchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
    branchId = effectiveBranchId;
    if (!branchId) return { merchants: [], total: 0 };
  }

  const where = branchId
    ? {
        OR: [
          { inductedBy: { branchId } },
          { lead: { zone: { branchId } } },
        ],
      }
    : {};

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy: { onboardingDate: "desc" },
      take: limit,
      skip: offset,
      include: {
        inductedBy: {
          select: {
            id: true,
            name: true,
            branchId: true,
            branch: { select: { name: true } },
          },
        },
        lead: {
          select: {
            businessName: true,
            category: true,
            zone: { select: { branch: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.merchant.count({ where }),
  ]);

  return {
    merchants: merchants.map((m) => ({
      id: m.id,
      ownerName: m.ownerName,
      citizenNumber: m.citizenNumber,
      phoneNumber: m.phoneNumber,
      onboardingDate: m.onboardingDate,
      inductedBy: { id: m.inductedBy.id, name: m.inductedBy.name },
      branchName: m.inductedBy.branch?.name ?? m.lead?.zone?.branch?.name ?? null,
      lead: m.lead ? { businessName: m.lead.businessName, category: m.lead.category } : null,
    })),
    total,
  };
}

export type MerchantDetail = {
  id: string;
  ownerName: string;
  nationalIdNumber: string | null;
  tradeLicenseNumber: string | null;
  tinNumber: string | null;
  phoneNumber: string;
  merchantAccountNumber: string;
  citizenNumber: string;
  onboardingDate: Date;
  oathSignatureUrl: string;
  inductedBy: { id: string; name: string };
  deploymentAssets: {
    id: string;
    name: string;
    displayName: string;
    description: string;
    briefSteps: string | null;
    link: string | null;
    iconUrl: string | null;
    onboardedAt: Date | null;
  }[];
  lead: {
    id: string;
    businessName: string;
    category: string;
    estimatedVolume: string;
    locationLat: number;
    locationLng: number;
    photoUrl: string | null;
    status: string;
    createdAt: Date;
  } | null;
};

/** Get full merchant detail by id. Caller must be in same branch (PLAYER/BRANCH_MANAGER) or ADMIN. */
export async function getMerchantDetail(merchantId: string): Promise<MerchantDetail | null> {
  const session = await getServerAuthSession();
  if (!session) return null;

  let effectiveBranchId: string | null = null;
  if (session.role === "PLAYER" || session.role === "BRANCH_MANAGER") {
    const user = await getCurrentUser(session.id);
    effectiveBranchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
    if (!effectiveBranchId) return null;
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      inductedBy: { select: { id: true, name: true, branchId: true } },
      deploymentAssets: {
        include: {
          deploymentAsset: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true,
              briefSteps: true,
              link: true,
              iconUrl: true,
            },
          },
        },
      },
      lead: {
        select: {
          id: true,
          businessName: true,
          category: true,
          estimatedVolume: true,
          locationLat: true,
          locationLng: true,
          photoUrl: true,
          status: true,
          createdAt: true,
          zoneId: true,
        },
      },
    },
  });
  if (!merchant) return null;

  const merchantBranchId =
    merchant.inductedBy.branchId ??
    (merchant.lead
      ? await prisma.zone
          .findUnique({
            where: { id: merchant.lead.zoneId },
            select: { branchId: true },
          })
          .then((z) => z?.branchId ?? null)
      : null);

  if (session.role !== "ADMIN" && merchantBranchId !== effectiveBranchId) return null;

  return {
    id: merchant.id,
    ownerName: merchant.ownerName,
    nationalIdNumber: merchant.nationalIdNumber ?? null,
    tradeLicenseNumber: merchant.tradeLicenseNumber ?? null,
    tinNumber: merchant.tinNumber ?? null,
    phoneNumber: merchant.phoneNumber,
    merchantAccountNumber: merchant.merchantAccountNumber,
    citizenNumber: merchant.citizenNumber,
    onboardingDate: merchant.onboardingDate,
    oathSignatureUrl: merchant.oathSignatureUrl,
    inductedBy: { id: merchant.inductedBy.id, name: merchant.inductedBy.name },
    deploymentAssets: merchant.deploymentAssets.map((ma) => ({
      id: ma.deploymentAsset.id,
      name: ma.deploymentAsset.name,
      displayName: ma.deploymentAsset.displayName,
      description: ma.deploymentAsset.description,
      briefSteps: ma.deploymentAsset.briefSteps,
      link: ma.deploymentAsset.link,
      iconUrl: ma.deploymentAsset.iconUrl,
      onboardedAt: ma.onboardedAt,
    })),
    lead: merchant.lead
      ? {
          id: merchant.lead.id,
          businessName: merchant.lead.businessName,
          category: merchant.lead.category,
          estimatedVolume: merchant.lead.estimatedVolume,
          locationLat: merchant.lead.locationLat,
          locationLng: merchant.lead.locationLng,
          photoUrl: merchant.lead.photoUrl,
          status: merchant.lead.status,
          createdAt: merchant.lead.createdAt,
        }
      : null,
  };
}

export type UpdateMerchantDetailsInput = {
  ownerName: string;
  nationalIdNumber?: string | null;
  tradeLicenseNumber?: string | null;
  tinNumber?: string | null;
  phoneNumber: string;
  merchantAccountNumber?: string;
  deploymentAssetIds: string[];
};

/** Update merchant details. BRANCH_MANAGER (same branch), ADMIN, or PLAYER only if they inducted this merchant. */
export async function updateMerchantDetails(
  merchantId: string,
  data: UpdateMerchantDetailsInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "updateMerchantDetails");
    const detail = await getMerchantDetail(merchantId);
    if (!detail) return { ok: false, error: "Merchant not found or access denied" };

    if (session.role === "PLAYER") {
      if (detail.inductedBy.id !== session.id) {
        return { ok: false, error: "You can only edit merchants you inducted." };
      }
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        ownerName: data.ownerName.trim(),
        nationalIdNumber: data.nationalIdNumber?.trim() ?? null,
        tradeLicenseNumber: data.tradeLicenseNumber?.trim() ?? null,
        tinNumber: data.tinNumber?.trim() ?? null,
        phoneNumber: data.phoneNumber.trim(),
        merchantAccountNumber: data.merchantAccountNumber?.trim() ?? "",
      },
    });

    // Update deployment assets: remove only those no longer in the list; add new ones. Preserve onboardedAt on existing links.
    const existing = await prisma.merchantDeploymentAsset.findMany({
      where: { merchantId },
      select: { deploymentAssetId: true },
    });
    const existingIds = new Set(existing.map((e) => e.deploymentAssetId));
    const toRemove = existing.filter((e) => !data.deploymentAssetIds.includes(e.deploymentAssetId));
    const toAdd = data.deploymentAssetIds.filter((id) => !existingIds.has(id));
    if (toRemove.length > 0) {
      await prisma.merchantDeploymentAsset.deleteMany({
        where: { merchantId, deploymentAssetId: { in: toRemove.map((r) => r.deploymentAssetId) } },
      });
    }
    if (toAdd.length > 0) {
      await prisma.merchantDeploymentAsset.createMany({
        data: toAdd.map((deploymentAssetId) => ({ merchantId, deploymentAssetId })),
        skipDuplicates: true,
      });
    }

    const actor = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });

    await logActivity(
      { id: session.id, role: session.role, branchId: session.branchId },
      actor?.name ?? "User",
      "MERCHANT_UPDATE",
      {
        entityType: "Merchant",
        entityId: merchantId,
        metadata: { updatedFields: Object.keys(data) },
      }
    );

    revalidatePath("/merchants");
    return { ok: true };
  } catch (e) {
    console.error("updateMerchantDetails error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update merchant",
    };
  }
}

/** Set deployment asset onboarded state for a merchant. BRANCH_MANAGER (same branch), ADMIN, or PLAYER only if they inducted this merchant. */
export async function setDeploymentAssetOnboarded(
  merchantId: string,
  deploymentAssetId: string,
  onboarded: boolean
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "setDeploymentAssetOnboarded");
    const detail = await getMerchantDetail(merchantId);
    if (!detail) return { ok: false, error: "Merchant not found or access denied" };

    if (session.role === "PLAYER") {
      if (detail.inductedBy.id !== session.id) {
        return { ok: false, error: "You can only update merchants you inducted." };
      }
    }

    const linkExists = detail.deploymentAssets.some((a) => a.id === deploymentAssetId);
    if (!linkExists) {
      return { ok: false, error: "This deployment asset is not assigned to this merchant." };
    }

    await prisma.merchantDeploymentAsset.update({
      where: {
        merchantId_deploymentAssetId: { merchantId, deploymentAssetId },
      },
      data: { onboardedAt: onboarded ? new Date() : null },
    });

    revalidatePath("/merchants");
    return { ok: true };
  } catch (e) {
    console.error("setDeploymentAssetOnboarded error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to update onboarded status",
    };
  }
}

