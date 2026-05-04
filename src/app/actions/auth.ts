"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  AUTH_COOKIE_NAME,
  IDLE_TIMEOUT_SECONDS,
  isAuthSecretConfigured,
  type AuthSession,
} from "@/lib/auth";
import { changePassword as changePasswordService, loginWithPassword } from "@/backend/services/auth-service";

export async function login(email: string, password: string) {
  if (!isAuthSecretConfigured()) {
    return {
      error:
        "Server misconfiguration: add JWT_SECRET or NEXTAUTH_SECRET in Vercel → Environment Variables, then redeploy.",
    };
  }
  try {
    const result = await loginWithPassword(email, password);
    if ("error" in result) return { error: result.error };

    const cookieStore = await cookies();
    const secureCookie =
      process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
    cookieStore.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: secureCookie,
      maxAge: IDLE_TIMEOUT_SECONDS,
    });
    const redirectTo = result.mustChangePassword ? "/change-password" : "/";
    return { ok: true as const, redirectTo };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[login] server action error:", e);
    if (process.env.NODE_ENV === "development") {
      return { error: message || "Sign in failed" };
    }
    if (
      message.includes("JWT_SECRET") ||
      message.includes("NEXTAUTH_SECRET")
    ) {
      return {
        error:
          "This deployment is missing an auth secret. In Vercel → Project → Settings → Environment Variables, add JWT_SECRET (or NEXTAUTH_SECRET), then redeploy.",
      };
    }
    if (
      message.includes("P1001") ||
      message.includes("P1000") ||
      message.includes("Can't reach database") ||
      message.toLowerCase().includes("prismaclientinitialization")
    ) {
      return {
        error:
          "Cannot reach the database. Set DATABASE_URL (and DIRECT_URL if you use Prisma migrate) in Vercel and redeploy.",
      };
    }
    return { error: "Sign in failed. Please try again." };
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
  const result = await changePasswordService(session as AuthSession, { currentPassword, newPassword });
  if (!result.ok) return { ok: false, error: result.error };

  const cookieStore = await cookies();
  const secureCookie =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  cookieStore.set(AUTH_COOKIE_NAME, result.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: secureCookie,
    maxAge: IDLE_TIMEOUT_SECONDS,
  });

  return { ok: true };
}
