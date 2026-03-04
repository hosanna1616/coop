"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  createToken,
  verifyPassword,
  hashPassword,
  AUTH_COOKIE_NAME,
  IDLE_TIMEOUT_SECONDS,
  type Role,
} from "@/lib/auth";
import { logActivity } from "@/app/actions/activity-log";

export async function login(email: string, password: string) {
  try {
    const user = await prisma.user.findFirst({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, role: true, branchId: true, passwordHash: true, mustChangePassword: true },
    });

    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return { error: "Invalid email or password" };
    }

    const token = await createToken({
      sub: user.id,
      role: user.role as Role,
      branchId: user.branchId,
      mustChangePassword: user.mustChangePassword ?? false,
    });

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: IDLE_TIMEOUT_SECONDS,
    });

    await logActivity(
      { id: user.id, role: user.role as Role, branchId: user.branchId },
      user.name,
      "LOGIN",
      { entityType: "User", entityId: user.id, branchId: user.branchId }
    );

    if (user.mustChangePassword) {
      redirect("/change-password");
    }
    if (user.role === "PLAYER") {
      redirect("/");
    }
    redirect("/");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    const message = e instanceof Error ? e.message : "Sign in failed";
    return { error: process.env.NODE_ENV === "development" ? message : "Sign in failed. Please try again." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  redirect("/login");
}

/** Change password for the current user. Verifies current password, sets new one, clears mustChangePassword, and refreshes session cookie. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const { getServerAuthSession } = await import("@/lib/auth");
  const session = await getServerAuthSession();
  if (!session) return { ok: false, error: "Not authenticated" };

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, name: true, passwordHash: true, role: true, branchId: true },
  });
  if (!user?.passwordHash) return { ok: false, error: "Cannot change password" };
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: "Current password is incorrect" };
  }
  if (newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters" };

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: session.id },
    data: { passwordHash, mustChangePassword: false },
  });

  const token = await createToken({
    sub: user.id,
    role: user.role as Role,
    branchId: user.branchId,
    mustChangePassword: false,
  });
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: IDLE_TIMEOUT_SECONDS,
  });

  await logActivity(
    { id: user.id, role: user.role as Role, branchId: user.branchId },
    user.name,
    "PASSWORD_CHANGE",
    { entityType: "User", entityId: user.id, branchId: user.branchId }
  );

  return { ok: true };
}
