import { prisma } from "@/lib/prisma";
import type { Role } from "@/lib/auth";

export type UserAuthRow = {
  id: string;
  name: string;
  role: Role;
  branchId: string | null;
  passwordHash: string | null;
  mustChangePassword: boolean;
};

export async function getUserByEmail(email: string): Promise<UserAuthRow | null> {
  return prisma.user.findFirst({
    where: { email },
    select: {
      id: true,
      name: true,
      role: true,
      branchId: true,
      passwordHash: true,
      mustChangePassword: true,
    },
  });
}

export async function getUserById(id: string): Promise<UserAuthRow | null> {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      role: true,
      branchId: true,
      passwordHash: true,
      mustChangePassword: true,
    },
  });
}

export async function updateUserPassword(params: {
  userId: string;
  passwordHash: string;
  mustChangePassword: boolean;
}): Promise<void> {
  await prisma.user.update({
    where: { id: params.userId },
    data: { passwordHash: params.passwordHash, mustChangePassword: params.mustChangePassword },
  });
}

