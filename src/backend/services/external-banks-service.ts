import { authorize } from "@/lib/auth";
import * as activityLogService from "@/backend/services/activity-log-service";
import * as externalBanksRepo from "@/backend/repositories/external-banks-repository";
import { getUserById } from "@/backend/repositories/user-repository";

export type ExternalBankRow = {
  id: string;
  name: string;
};

export async function getExternalBanks(): Promise<ExternalBankRow[]> {
  await authorize(["ADMIN", "BRANCH_MANAGER", "PLAYER"], "getExternalBanks");
  return externalBanksRepo.listExternalBanks();
}

export async function getExternalBanksForAdmin(): Promise<ExternalBankRow[]> {
  await authorize(["ADMIN"], "getExternalBanksForAdmin");
  return externalBanksRepo.listExternalBanks();
}

export async function createExternalBank(name: string): Promise<ExternalBankRow> {
  const session = await authorize(["ADMIN"], "createExternalBank");
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Bank name is required.");

  const existing = await externalBanksRepo.findExternalBankByName(normalizedName);
  if (existing) throw new Error("An other service with this name already exists.");

  const bank = await externalBanksRepo.createExternalBank(normalizedName);
  const actor = (await getUserById(session.id))?.name;

  await activityLogService.logActivity(session, actor ?? "Admin", "EXTERNAL_BANK_CREATE", {
    entityType: "ExternalBank",
    entityId: bank.id,
    metadata: { name: bank.name },
  });

  return bank;
}

export async function deleteExternalBank(id: string): Promise<void> {
  const session = await authorize(["ADMIN"], "deleteExternalBank");
  const existing = await externalBanksRepo.deleteExternalBank(id).catch(() => null);
  // repository throws when not found; preserve old behavior
  if (!existing) throw new Error("Other service not found.");

  const actor = (await getUserById(session.id))?.name;
  await activityLogService.logActivity(session, actor ?? "Admin", "EXTERNAL_BANK_DELETE", {
    entityType: "ExternalBank",
    entityId: id,
    metadata: { name: existing.name },
  });
}

