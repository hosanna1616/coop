import { verifyPassword, hashPassword, createToken, type Role, type AuthSession } from "@/lib/auth";
import { getUserByEmail, getUserById, updateUserPassword } from "@/backend/repositories/user-repository";
import * as activityLogService from "@/backend/services/activity-log-service";

export type LoginSuccess = {
  token: string;
  role: Role;
  branchId: string | null;
  mustChangePassword: boolean;
};

export type LoginError = {
  error: string;
};

export type LoginResult = LoginSuccess | LoginError;

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const user = await getUserByEmail(email.trim().toLowerCase());

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password" };
  }

  const token = await createToken({
    sub: user.id,
    role: user.role,
    branchId: user.branchId,
    mustChangePassword: user.mustChangePassword ?? false,
  });

  try {
    await activityLogService.logActivity(
      { id: user.id, role: user.role, branchId: user.branchId },
      user.name,
      "LOGIN",
      { entityType: "User", entityId: user.id, branchId: user.branchId },
    );
  } catch (logErr) {
    console.error("[auth] LOGIN activity log failed (sign-in still succeeds):", logErr);
  }

  return {
    token,
    role: user.role,
    branchId: user.branchId,
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

export type ChangePasswordResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

export async function changePassword(
  session: AuthSession,
  params: { currentPassword: string; newPassword: string }
): Promise<ChangePasswordResult> {
  const user = await getUserById(session.id);
  if (!user?.passwordHash) return { ok: false, error: "Cannot change password" };

  if (!(await verifyPassword(params.currentPassword, user.passwordHash))) {
    return { ok: false, error: "Current password is incorrect" };
  }

  if (params.newPassword.length < 6) return { ok: false, error: "New password must be at least 6 characters" };

  const passwordHash = await hashPassword(params.newPassword);
  await updateUserPassword({ userId: session.id, passwordHash, mustChangePassword: false });

  const token = await createToken({
    sub: user.id,
    role: user.role,
    branchId: user.branchId,
    mustChangePassword: false,
  });

  try {
    await activityLogService.logActivity(
      { id: user.id, role: user.role, branchId: user.branchId },
      user.name,
      "PASSWORD_CHANGE",
      { entityType: "User", entityId: user.id, branchId: user.branchId },
    );
  } catch (logErr) {
    console.error("[auth] PASSWORD_CHANGE activity log failed:", logErr);
  }

  return { ok: true, token };
}

