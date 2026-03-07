"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type KycFormDraft = {
  ownerName?: string;
  nationalIdNumber?: string;
  tradeLicenseNumber?: string;
  tinNumber?: string;
  phoneNumber?: string;
  merchantAccountNumber?: string;
};

/** Get induction draft for the current user and lead. Returns null if none. */
export async function getInductionDraft(leadId: string): Promise<{
  currentStep: number;
  kycFormData: KycFormDraft | null;
} | null> {
  try {
    const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "getInductionDraft");
    const draft = await prisma.inductionDraft.findUnique({
      where: { leadId_userId: { leadId, userId: session.id } },
    });
    if (!draft) return null;
    return {
      currentStep: draft.currentStep,
      kycFormData: draft.kycFormData as KycFormDraft | null,
    };
  } catch {
    return null;
  }
}

/** Save induction progress so the user can continue later. */
export async function saveInductionDraft(
  leadId: string,
  currentStep: number,
  kycFormData?: KycFormDraft | null
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "saveInductionDraft");
    await prisma.inductionDraft.upsert({
      where: { leadId_userId: { leadId, userId: session.id } },
      create: {
        leadId,
        userId: session.id,
        currentStep,
        kycFormData: kycFormData ?? undefined,
      },
      update: {
        currentStep,
        kycFormData: kycFormData ?? undefined,
      },
    });
    revalidatePath(`/induct/${leadId}`);
    revalidatePath("/induct/zone");
    return { ok: true };
  } catch (e) {
    console.error("saveInductionDraft error", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to save progress",
    };
  }
}

/** Clear draft after induction is completed or when starting fresh. */
export async function clearInductionDraft(leadId: string): Promise<void> {
  try {
    const session = await authorize(["BRANCH_MANAGER", "PLAYER"], "clearInductionDraft");
    await prisma.inductionDraft.deleteMany({
      where: { leadId, userId: session.id },
    });
    revalidatePath(`/induct/${leadId}`);
  } catch {
    // ignore
  }
}
