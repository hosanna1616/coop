"use server";

import {
  createExternalBank as createExternalBankService,
  deleteExternalBank as deleteExternalBankService,
  getExternalBanks as getExternalBanksService,
  getExternalBanksForAdmin as getExternalBanksForAdminService,
} from "@/backend/services/external-banks-service";

export type ExternalBankRow = {
  id: string;
  name: string;
};

/** Get external banks for scouting forms. */
export async function getExternalBanks(): Promise<ExternalBankRow[]> {
  return getExternalBanksService();
}

/** Get all external banks for admin management. */
export async function getExternalBanksForAdmin(): Promise<ExternalBankRow[]> {
  return getExternalBanksForAdminService();
}

/** Create external bank. ADMIN only. */
export async function createExternalBank(name: string): Promise<ExternalBankRow> {
  return createExternalBankService(name);
}

/** Delete external bank. ADMIN only. */
export async function deleteExternalBank(id: string): Promise<void> {
  return deleteExternalBankService(id);
}
