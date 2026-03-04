"use server";

import { prisma } from "@/lib/prisma";
import { authorize, getServerAuthSession } from "@/lib/auth";
import { getCurrentUser } from "@/app/actions/users";

export async function getLeadsForMissions() {
  return prisma.lead.findMany({
    where: { status: { not: "CONVERTED" } },
    include: { zone: { select: { code: true } } },
    orderBy: { id: "desc" },
    take: 50,
  });
}

export async function getLeadsForZone(zoneId: string) {
  return prisma.lead.findMany({
    where: { zoneId, status: { not: "CONVERTED" } },
    select: { id: true, businessName: true, category: true },
    orderBy: { createdAt: "desc" },
  });
}

export type LeadsByBranchFilters = {
  branchId: string | null;
  limit?: number;
  offset?: number;
};

/** Scouted leads by branch. Player/branch manager: their branch only. Admin: optional branchId (null = all). */
export async function getLeadsByBranch(filters: LeadsByBranchFilters): Promise<{
  leads: {
    id: string;
    businessName: string;
    category: string;
    status: string;
    estimatedVolume: string;
    createdAt: Date;
    scoutedBy: { id: string; name: string };
    branchName: string | null;
  }[];
  total: number;
}> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getLeadsByBranch");
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  let branchId: string | null = filters.branchId ?? null;
  if (session.role === "BRANCH_MANAGER" || session.role === "PLAYER") {
    const user = await getCurrentUser(session.id);
    const effectiveBranchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
    branchId = effectiveBranchId;
    if (!branchId) return { leads: [], total: 0 };
  }

  const where = branchId
    ? {
        OR: [
          { scoutedBy: { branchId } },
          { zone: { branchId } },
        ],
      }
    : {};

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        scoutedBy: {
          select: {
            id: true,
            name: true,
            branchId: true,
            branch: { select: { name: true } },
          },
        },
        zone: { select: { branchId: true, branch: { select: { name: true } } } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads: leads.map((l) => ({
      id: l.id,
      businessName: l.businessName,
      category: l.category,
      status: l.status,
      estimatedVolume: l.estimatedVolume,
      createdAt: l.createdAt,
      scoutedBy: { id: l.scoutedBy.id, name: l.scoutedBy.name },
      branchName: l.scoutedBy.branch?.name ?? l.zone?.branch?.name ?? null,
    })),
    total,
  };
}

/** Leads and merchants in a zone by zone code. All authenticated users can see (for map cell click). */
export async function getLeadsAndMerchantsByZoneCode(zoneCode: string): Promise<{
  leads: {
    id: string;
    businessName: string;
    category: string;
    estimatedVolume: string;
    scoutedBy: { id: string; name: string };
    createdAt: Date;
  }[];
  merchants: {
    id: string;
    ownerName: string;
    phoneNumber: string;
    lead: { businessName: string; category: string } | null;
    inductedBy: { id: string; name: string };
    onboardingDate: Date;
  }[];
}> {
  const session = await getServerAuthSession();
  if (!session) return { leads: [], merchants: [] };

  const zone = await prisma.zone.findUnique({
    where: { code: zoneCode },
    select: { id: true },
  });
  if (!zone) return { leads: [], merchants: [] };

  const [leads, merchants] = await Promise.all([
    prisma.lead.findMany({
      where: { zoneId: zone.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        businessName: true,
        category: true,
        estimatedVolume: true,
        createdAt: true,
        scoutedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.merchant.findMany({
      where: { lead: { zoneId: zone.id } },
      orderBy: { onboardingDate: "desc" },
      select: {
        id: true,
        ownerName: true,
        phoneNumber: true,
        onboardingDate: true,
        inductedBy: { select: { id: true, name: true } },
        lead: { select: { businessName: true, category: true } },
      },
    }),
  ]);

  return { leads, merchants };
}
