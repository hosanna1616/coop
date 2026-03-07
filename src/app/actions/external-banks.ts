"use server";

import { prisma } from "@/lib/prisma";
import { authorize } from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

export type ExternalBankRow = {
  id: string;
  name: string;
};

/** Get external banks for scouting forms. */
export async function getExternalBanks(): Promise<ExternalBankRow[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getExternalBanks");
  const banks = await prisma.externalBank.findMany({
    orderBy: { name: "asc" },
  });
  return banks.map((bank) => ({ id: bank.id, name: bank.name }));
}

/** Get all external banks for admin management. */
export async function getExternalBanksForAdmin(): Promise<ExternalBankRow[]> {
  await authorize(["ADMIN"], "getExternalBanksForAdmin");
  const banks = await prisma.externalBank.findMany({
    orderBy: { name: "asc" },
  });
  return banks.map((bank) => ({ id: bank.id, name: bank.name }));
}

/** Create external bank. ADMIN only. */
export async function createExternalBank(name: string): Promise<ExternalBankRow> {
  const session = await authorize(["ADMIN"], "createExternalBank");
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Bank name is required.");

  const existing = await prisma.externalBank.findUnique({
    where: { name: normalizedName },
  });
  if (existing) throw new Error("An other service with this name already exists.");

  const bank = await prisma.externalBank.create({
    data: { name: normalizedName },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "EXTERNAL_BANK_CREATE", {
    entityType: "ExternalBank",
    entityId: bank.id,
    metadata: { name: bank.name },
  });

  return { id: bank.id, name: bank.name };
}

/** Delete external bank. ADMIN only. */
export async function deleteExternalBank(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteExternalBank");
  const existing = await prisma.externalBank.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Other service not found.");

  await prisma.externalBank.delete({ where: { id } });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });
  await logActivity(session, actor?.name ?? "Admin", "EXTERNAL_BANK_DELETE", {
    entityType: "ExternalBank",
    entityId: id,
    metadata: { name: existing.name },
  });
}
