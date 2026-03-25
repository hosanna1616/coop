"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, IDLE_TIMEOUT_SECONDS, type AuthSession } from "@/lib/auth";
import { changePassword as changePasswordService, loginWithPassword } from "@/backend/services/auth-service";

export async function login(email: string, password: string) {
  try {
    const result = await loginWithPassword(email, password);
    if ("error" in result) return { error: result.error };

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, result.token, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: IDLE_TIMEOUT_SECONDS,
    });
    if (result.mustChangePassword) {
      redirect("/change-password");
    }
    if (result.role === "PLAYER") {
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
  const result = await changePasswordService(session as AuthSession, { currentPassword, newPassword });
  if (!result.ok) return { ok: false, error: result.error };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, result.token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: IDLE_TIMEOUT_SECONDS,
  });

  return { ok: true };
}
