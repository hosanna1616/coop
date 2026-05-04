import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

export type Role = "PLAYER" | "BRANCH_MANAGER" | "ADMIN";

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized", public actionName?: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export type AuthSession = {
  id: string;
  role: Role;
  branchId: string | null;
  mustChangePassword?: boolean;
};

const AUTH_COOKIE_NAME = "mn_token";
/** Session expires 5 minutes after last activity (idle timeout). */
const IDLE_TIMEOUT_SECONDS = 5 * 60;

function resolveAuthSecret(): string | null {
  return process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || null;
}

/** True when session cookies can be signed (required for login on any host). */
export function isAuthSecretConfigured(): boolean {
  return Boolean(resolveAuthSecret());
}

function getJwtSecret(): Uint8Array {
  const secret = resolveAuthSecret();
  if (!secret) throw new Error("JWT_SECRET is not set (or NEXTAUTH_SECRET fallback)");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createToken(payload: {
  sub: string;
  role: Role;
  branchId: string | null;
  mustChangePassword?: boolean;
}): Promise<string> {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    role: payload.role,
    branchId: payload.branchId,
    mustChangePassword: payload.mustChangePassword ?? false,
    lastActivity: now,
  })
    .setSubject(payload.sub)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + IDLE_TIMEOUT_SECONDS)
    .setIssuedAt(now)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    const sub = payload.sub;
    const role = payload.role as Role;
    if (!sub || !role) return null;
    if (!["PLAYER", "BRANCH_MANAGER", "ADMIN"].includes(role)) return null;
    const lastActivity = payload.lastActivity as number | undefined;
    if (typeof lastActivity === "number") {
      const now = Math.floor(Date.now() / 1000);
      if (now > lastActivity + IDLE_TIMEOUT_SECONDS) return null;
    }
    return {
      id: sub,
      role,
      branchId: (payload.branchId as string | null) ?? null,
      mustChangePassword: (payload.mustChangePassword as boolean) ?? false,
    };
  } catch {
    return null;
  }
}

export async function getServerAuthSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function hasPermission(requiredRoles: Role[], userRole: Role): boolean {
  return requiredRoles.includes(userRole);
}

export async function authorize(
  requiredRoles: Role[],
  actionName?: string
): Promise<AuthSession> {
  const session = await getServerAuthSession();
  if (!session) throw new UnauthorizedError("Not authenticated", actionName);
  if (!hasPermission(requiredRoles, session.role)) {
    throw new UnauthorizedError(`Insufficient permissions for ${actionName ?? "this action"}`, actionName);
  }
  return session;
}

export { AUTH_COOKIE_NAME, IDLE_TIMEOUT_SECONDS };
