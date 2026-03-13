"use server";

import { prisma } from "@/lib/prisma";
import { authorize, getServerAuthSession } from "@/lib/auth";
import { getCurrentUser } from "@/app/actions/users";
import { pointInPolygon } from "@/lib/territoryGrid";

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

/** Leads and merchants whose location falls inside a cell polygon. Use this when the cell is a territory cell
 * whose polygon may change when territory is reshaped—so we match by geography, not zone code. */
export async function getLeadsAndMerchantsByCell(
  branchId: string,
  cellCoordinates: { lat: number; lng: number }[]
): Promise<{
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

  if (session.role === "BRANCH_MANAGER" || session.role === "PLAYER") {
    const user = await getCurrentUser(session.id);
    const effectiveBranchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
    if (effectiveBranchId !== branchId) return { leads: [], merchants: [] };
  } else if (session.role === "ADMIN") {
    // admin can pass any branchId
  } else {
    return { leads: [], merchants: [] };
  }

  if (!cellCoordinates || cellCoordinates.length < 3) return { leads: [], merchants: [] };

  const branchWhere = {
    OR: [{ scoutedBy: { branchId } }, { zone: { branchId } }],
  };

  const [allLeads, allMerchants] = await Promise.all([
    prisma.lead.findMany({
      where: branchWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        businessName: true,
        category: true,
        estimatedVolume: true,
        createdAt: true,
        locationLat: true,
        locationLng: true,
        scoutedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.merchant.findMany({
      where: {
        lead: branchWhere,
      },
      orderBy: { onboardingDate: "desc" },
      select: {
        id: true,
        ownerName: true,
        phoneNumber: true,
        onboardingDate: true,
        inductedBy: { select: { id: true, name: true } },
        lead: {
          select: {
            businessName: true,
            category: true,
            locationLat: true,
            locationLng: true,
          },
        },
      },
    }),
  ]);

  const polygon = cellCoordinates;
  const leads = allLeads.filter((l) => pointInPolygon(l.locationLat, l.locationLng, polygon));
  const merchants = allMerchants.filter(
    (m) => m.lead && pointInPolygon(m.lead.locationLat, m.lead.locationLng, polygon)
  );

  return {
    leads: leads.map((l) => ({
      id: l.id,
      businessName: l.businessName,
      category: l.category,
      estimatedVolume: l.estimatedVolume,
      createdAt: l.createdAt,
      scoutedBy: l.scoutedBy,
    })),
    merchants: merchants.map((m) => ({
      id: m.id,
      ownerName: m.ownerName,
      phoneNumber: m.phoneNumber,
      onboardingDate: m.onboardingDate,
      inductedBy: m.inductedBy,
      lead: m.lead ? { businessName: m.lead.businessName, category: m.lead.category } : null,
    })),
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
