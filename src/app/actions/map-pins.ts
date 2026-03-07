"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { getCurrentUser } from "@/app/actions/users";

export type MapPinScouted = {
  id: string;
  businessName: string;
  category: string;
  estimatedVolume: string;
  locationLat: number;
  locationLng: number;
  photoUrl: string | null;
  createdAt: Date;
  scoutedBy: { id: string; name: string };
};

export type MapPinInducted = {
  id: string;
  ownerName: string;
  citizenNumber: string;
  locationLat: number;
  locationLng: number;
  businessName: string;
  category: string;
  photoUrl: string | null;
  inductedBy: { id: string; name: string };
  onboardingDate: Date;
};

export type MapPinsResult = {
  scouted: MapPinScouted[];
  inducted: MapPinInducted[];
};

/** Pins for scouted leads and inducted merchants on the map. ADMIN, BRANCH_MANAGER, and PLAYER (branch-scoped). branchId null for admin = all branches. */
export async function getMapPins(branchId?: string | null): Promise<MapPinsResult> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getMapPins");

  let effectiveBranchId: string | null = branchId ?? null;
  if (session.role === "BRANCH_MANAGER" || session.role === "PLAYER") {
    const user = await getCurrentUser(session.id);
    effectiveBranchId = session.branchId ?? user?.branchId ?? user?.team?.branchId ?? null;
  }

  const leadWhere =
    effectiveBranchId != null
      ? {
          merchant: null,
          status: { not: "CONVERTED" },
          OR: [
            { zone: { branchId: effectiveBranchId } },
            { scoutedBy: { branchId: effectiveBranchId } },
            { scoutedBy: { team: { branchId: effectiveBranchId } } },
            { scoutedById: session.id },
          ],
        }
      : session.role === "ADMIN"
        ? { merchant: null, status: { not: "CONVERTED" } }
        : {
            merchant: null,
            status: { not: "CONVERTED" },
            scoutedById: session.id,
          };

  const merchantWhere =
    effectiveBranchId != null
      ? {
          OR: [
            { inductedBy: { branchId: effectiveBranchId } },
            { inductedBy: { team: { branchId: effectiveBranchId } } },
            { lead: { zone: { branchId: effectiveBranchId } } },
            { inductedById: session.id },
          ],
        }
      : session.role === "ADMIN"
        ? {}
        : { inductedById: session.id };

  const [scoutedLeads, inductedMerchants] = await Promise.all([
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        businessName: true,
        category: true,
        estimatedVolume: true,
        locationLat: true,
        locationLng: true,
        photoUrl: true,
        createdAt: true,
        scoutedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.merchant.findMany({
      where: merchantWhere,
      orderBy: { onboardingDate: "desc" },
      take: 500,
      select: {
        id: true,
        ownerName: true,
        citizenNumber: true,
        onboardingDate: true,
        inductedBy: { select: { id: true, name: true } },
        lead: {
          select: {
            businessName: true,
            category: true,
            locationLat: true,
            locationLng: true,
            photoUrl: true,
          },
        },
      },
    }),
  ]);

  const scouted: MapPinScouted[] = scoutedLeads.map((l) => ({
    id: l.id,
    businessName: l.businessName,
    category: l.category,
    estimatedVolume: l.estimatedVolume,
    locationLat: l.locationLat,
    locationLng: l.locationLng,
    photoUrl: l.photoUrl,
    createdAt: l.createdAt,
    scoutedBy: l.scoutedBy,
  }));

  const inducted: MapPinInducted[] = inductedMerchants
    .filter((m) => m.lead != null)
    .map((m) => ({
      id: m.id,
      ownerName: m.ownerName,
      citizenNumber: m.citizenNumber,
      locationLat: m.lead!.locationLat,
      locationLng: m.lead!.locationLng,
      businessName: m.lead!.businessName,
      category: m.lead!.category,
      photoUrl: m.lead!.photoUrl,
      inductedBy: m.inductedBy,
      onboardingDate: m.onboardingDate,
    }));

  return { scouted, inducted };
}
