import { prisma } from "@/lib/prisma";

export type ExternalBankRow = {
  id: string;
  name: string;
};

export async function listExternalBanks(): Promise<ExternalBankRow[]> {
  const banks = await prisma.externalBank.findMany({
    orderBy: { name: "asc" },
  });
  return banks.map((bank) => ({ id: bank.id, name: bank.name }));
}

export async function findExternalBankByName(name: string): Promise<ExternalBankRow | null> {
  const existing = await prisma.externalBank.findUnique({
    where: { name },
  });
  if (!existing) return null;
  return { id: existing.id, name: existing.name };
}

export async function createExternalBank(name: string): Promise<ExternalBankRow> {
  const bank = await prisma.externalBank.create({
    data: { name },
  });
  return { id: bank.id, name: bank.name };
}

export async function deleteExternalBank(id: string): Promise<{ id: string; name: string }> {
  const existing = await prisma.externalBank.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!existing) throw new Error("Other service not found.");

  await prisma.externalBank.delete({ where: { id } });
  return existing;
}

