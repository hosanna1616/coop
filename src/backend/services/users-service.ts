import { prisma } from "@/lib/prisma";
import { authorize, getServerAuthSession, type Role, hashPassword } from "@/lib/auth";
import type { AuthSession } from "@/lib/auth";
import { logActivity } from "@/backend/services/activity-log-service";
import * as branchesService from "@/backend/services/branches-service";

export type CreateUserData = {
  name: string;
  email: string;
  password: string;
  role: Role;
  teamId?: string | null;
  branchId?: string | null;
  /** When creating BRANCH_MANAGER, pass branch from branches.json; resolved to branchId */
  branchCode?: string | null;
};

function isPrismaConnectionError(e: unknown): boolean {
  if (e && typeof e === "object" && "name" in e) {
    const name = (e as { name?: string }).name;
    if (name === "PrismaClientInitializationError" || name === "PrismaClientKnownRequestError") return true;
  }
  if (e && typeof e === "object" && "message" in e) {
    const msg = String((e as { message?: unknown }).message ?? "");
    if (msg.includes("Authentication failed") || msg.includes("database server")) return true;
  }
  return false;
}

export async function getCurrentUser(userId?: string | null) {
  try {
    if (userId) {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          rank: true,
          xp: true,
          role: true,
          branchId: true,
          team: { select: { name: true, branchId: true } },
          branch: { select: { name: true } },
        },
      });
      return u ?? null;
    }
    return null;
  } catch (e) {
    if (isPrismaConnectionError(e)) return null;
    throw e;
  }
}

export async function getProfileStats(userId: string, options: { branchId?: string | null; role?: string }) {
  const { branchId, role } = options;
  const isAdmin = role === "ADMIN";
  const scopeBranchId = isAdmin ? null : branchId ?? null;

  try {
    const [cellsScouted, zonesCaptured, merchantsInducted, tasksApproved] = await Promise.all([
      // Territory cells with status SCOUTED (in branch or all)
      scopeBranchId == null
        ? prisma.territoryCell.count({ where: { status: "SCOUTED" } })
        : prisma.territoryCell.count({
            where: { branchId: scopeBranchId, status: "SCOUTED" },
          }),
      // Zones with status CAPTURED (in branch or all)
      scopeBranchId == null
        ? prisma.zone.count({ where: { status: "CAPTURED" } })
        : prisma.zone.count({
            where: { branchId: scopeBranchId, status: "CAPTURED" },
          }),
      // Merchants inducted: by lead's zone branch (or all)
      scopeBranchId == null
        ? prisma.merchant.count()
        : prisma.merchant.count({
            where: { lead: { zone: { branchId: scopeBranchId } } },
          }),
      // Mission tasks approved (in branch or all)
      scopeBranchId == null
        ? prisma.missionTask.count({ where: { status: "APPROVED" } })
        : prisma.missionTask.count({
            where: {
              status: "APPROVED",
              mission: { branchId: scopeBranchId },
            },
          }),
    ]);

    return {
      zonesScouted: cellsScouted,
      merchantsInducted,
      zonesCaptured,
      missionsCompleted: tasksApproved,
    };
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return {
        zonesScouted: 0,
        merchantsInducted: 0,
        zonesCaptured: 0,
        missionsCompleted: 0,
      };
    }
    throw e;
  }
}

export async function getLeaderboard(limit = 20, branchId?: string | null) {
  try {
    const where = branchId
      ? {
          role: "PLAYER" as Role,
          OR: [{ branchId }, { team: { branchId } }],
        }
      : { role: "PLAYER" as Role };

    const rows = await prisma.user.findMany({
      where,
      orderBy: { xp: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        rank: true,
        xp: true,
        branchId: true,
        team: { select: { branchId: true } },
        scoutedLeads: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { zone: { select: { code: true } } },
        },
        _count: { select: { ownedZones: true, scoutedLeads: true } },
      },
    });

    const branchIds = Array.from(
      new Set(
        rows
          .map((u) => u.branchId ?? u.team?.branchId ?? null)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const managers =
      branchIds.length > 0
        ? await prisma.user.findMany({
            where: {
              role: "BRANCH_MANAGER",
              OR: [{ branchId: { in: branchIds } }, { team: { branchId: { in: branchIds } } }],
            },
            select: {
              name: true,
              branchId: true,
              team: { select: { branchId: true } },
            },
            orderBy: { name: "asc" },
          })
        : [];

    const managerByBranchId = new Map<string, string>();
    for (const m of managers) {
      const bId = m.branchId ?? m.team?.branchId ?? null;
      if (!bId) continue;
      if (!managerByBranchId.has(bId)) managerByBranchId.set(bId, m.name);
    }

    return rows.map(({ _count, scoutedLeads, team, branchId, ...u }) => {
      const resolvedBranchId = branchId ?? team?.branchId ?? null;
      return {
        ...u,
        zones: _count.ownedZones,
        scouts: _count.scoutedLeads,
        managerName: resolvedBranchId ? managerByBranchId.get(resolvedBranchId) ?? "—" : "—",
        latestZoneCode: scoutedLeads[0]?.zone?.code ?? "—",
      };
    });
  } catch (e) {
    if (isPrismaConnectionError(e)) return [];
    throw e;
  }
}

/** Leaderboard data for dashboard: top N entries + current user's position and entry. */
export async function getLeaderboardForDashboard(limit: number, currentUserId: string, branchId?: string | null) {
  const all = await getLeaderboard(limit * 3, branchId);
  const currentIndex = all.findIndex((u) => u.id === currentUserId);
  const currentUserEntry = currentIndex >= 0 ? all[currentIndex] : null;
  const position = currentIndex >= 0 ? currentIndex + 1 : null;
  const entries = all.slice(0, limit);
  return { entries, position, currentUserEntry };
}

export async function getUsersForAdmin(
  branchIdFilter?: string | null,
  options?: { limit?: number; offset?: number }
): Promise<{
  users: { id: string; name: string; role: string; teamName: string | null; branchName: string | null }[];
  total: number;
}> {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"] as Role[], "getUsersForAdmin");
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);

  try {
    if (session.role === "ADMIN") {
      const where =
        branchIdFilter != null
          ? { role: { not: "ADMIN" as Role }, OR: [{ branchId: branchIdFilter }, { team: { branchId: branchIdFilter } }] }
          : { role: { not: "ADMIN" as Role } };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy: { name: "asc" },
          take: limit,
          skip: offset,
          select: {
            id: true,
            name: true,
            role: true,
            team: { select: { name: true } },
            branch: { select: { name: true } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      return {
        users: users.map((u) => ({
          id: u.id,
          name: u.name,
          role: u.role,
          teamName: u.team?.name ?? null,
          branchName: u.branch?.name ?? null,
        })),
        total,
      };
    }

    const where = {
      role: "PLAYER" as const,
      OR: [{ branchId: session.branchId }, { team: { branchId: session.branchId } }],
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          role: true,
          team: { select: { name: true } },
          branch: { select: { name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        role: u.role,
        teamName: u.team?.name ?? null,
        branchName: u.branch?.name ?? null,
      })),
      total,
    };
  } catch (e) {
    if (isPrismaConnectionError(e)) return { users: [], total: 0 };
    throw e;
  }
}

export async function createUser(data: CreateUserData) {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"] as Role[], "createUser");

  let resolvedBranchId: string | null = data.branchId ?? null;
  if (session.role === "ADMIN" && data.role === "BRANCH_MANAGER") {
    if (data.branchId) resolvedBranchId = data.branchId;
    else if (data.branchCode) {
      const branch = await prisma.branch.findUnique({
        where: { branchCode: data.branchCode },
        select: { id: true },
      });
      resolvedBranchId = branch?.id ?? null;
    }
  }

  if (session.role === "BRANCH_MANAGER") {
    if (data.role !== "PLAYER") throw new Error("Branch managers can only create PLAYER users.");
    if (!session.branchId) throw new Error("Branch manager has no branch assigned.");
    resolvedBranchId = session.branchId;
    if (data.teamId) {
      const team = await prisma.team.findUnique({
        where: { id: data.teamId },
        select: { branchId: true },
      });
      if (team?.branchId !== session.branchId) throw new Error("Team must be in your branch.");
    }
  } else {
    if ((data.role === "ADMIN" || data.role === "BRANCH_MANAGER") && session.role !== "ADMIN") {
      throw new Error("Only ADMIN can create ADMIN or BRANCH_MANAGER users.");
    }
  }

  const emailNorm = data.email.trim().toLowerCase();
  if (!emailNorm) throw new Error("Email is required.");
  if (!data.password || data.password.length < 6) throw new Error("Password must be at least 6 characters.");

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: emailNorm,
      passwordHash,
      mustChangePassword: true,
      role: data.role,
      teamId: data.role === "ADMIN" ? null : data.teamId ?? undefined,
      branchId:
        data.role === "ADMIN"
          ? null
          : data.role === "BRANCH_MANAGER"
            ? resolvedBranchId ?? undefined
            : undefined,
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });

  await logActivity(session, actor?.name ?? "User", "USER_CREATE", {
    entityType: "User",
    entityId: user.id,
    branchId: resolvedBranchId,
    metadata: { name: user.name, role: user.role },
  });

  return user;
}

export async function updateUserRole(userId: string, newRole: Role) {
  const session = await authorize(["ADMIN"], "updateUserRole");
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      role: newRole,
      // Admins are not under any branch; clear branch/team when promoting to ADMIN
      ...(newRole === "ADMIN" && { branchId: null, teamId: null }),
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });

  await logActivity(session, actor?.name ?? "Admin", "USER_UPDATE_ROLE", {
    entityType: "User",
    entityId: userId,
    metadata: { targetName: before?.name, oldRole: before?.role, newRole },
  });
}

export type UpdateUserData = {
  name?: string;
  email?: string | null;
  teamId?: string | null;
};

/** Branch manager can update name, email, team for users in their branch. */
export async function updateUser(userId: string, data: UpdateUserData) {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"] as Role[], "updateUser");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, team: { select: { branchId: true } }, name: true },
  });
  if (!target) throw new Error("User not found");

  const targetBranchId = target.branchId ?? target.team?.branchId ?? null;
  if (session.role === "BRANCH_MANAGER") {
    if (!session.branchId || targetBranchId !== session.branchId) {
      throw new Error("You can only edit users in your branch.");
    }
  }

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, teamId: true },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.teamId !== undefined && { teamId: data.teamId || null }),
    },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });

  await logActivity(session, actor?.name ?? "User", "USER_UPDATE", {
    entityType: "User",
    entityId: userId,
    branchId: targetBranchId,
    metadata: { targetName: before?.name, updates: data },
  });
}

const DISPLAY_NAME_MIN_LEN = 1;
const DISPLAY_NAME_MAX_LEN = 120;

/** Any signed-in user may update only their own display name (for leaderboards and UI). */
export async function updateMyDisplayName(
  rawName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getServerAuthSession();
  if (!session) return { ok: false, error: "Not signed in." };

  const name = rawName.trim().replace(/\s+/g, " ");
  if (name.length < DISPLAY_NAME_MIN_LEN) {
    return { ok: false, error: "Enter a display name (at least one character)." };
  }
  if (name.length > DISPLAY_NAME_MAX_LEN) {
    return {
      ok: false,
      error: `Display name must be ${DISPLAY_NAME_MAX_LEN} characters or fewer.`,
    };
  }

  try {
    const before = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });
    if (!before) return { ok: false, error: "Account not found." };
    if (before.name === name) return { ok: true };

    await prisma.user.update({
      where: { id: session.id },
      data: { name },
    });

    const actor = await prisma.user.findUnique({
      where: { id: session.id },
      select: { name: true },
    });

    await logActivity(session, actor?.name ?? name, "USER_PROFILE_NAME_UPDATE", {
      entityType: "User",
      entityId: session.id,
      branchId: session.branchId,
      metadata: { previousName: before.name, newName: name, selfService: true },
    });

    return { ok: true };
  } catch (e) {
    if (isPrismaConnectionError(e)) {
      return { ok: false, error: "Could not reach the database. Try again shortly." };
    }
    console.error("[updateMyDisplayName]", e);
    return { ok: false, error: "Something went wrong. Try again." };
  }
}

/** Branch manager can reset password for users in their branch. */
export async function resetUserPassword(userId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const session = await authorize(["BRANCH_MANAGER", "ADMIN"] as Role[], "resetUserPassword");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { branchId: true, team: { select: { branchId: true } }, name: true },
  });

  if (!target) return { ok: false, error: "User not found" };

  const targetBranchId = target.branchId ?? target.team?.branchId ?? null;
  if (session.role === "BRANCH_MANAGER") {
    if (!session.branchId || targetBranchId !== session.branchId) {
      return { ok: false, error: "You can only reset password for users in your branch." };
    }
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  const actor = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true },
  });

  await logActivity(session, actor?.name ?? "User", "USER_RESET_PASSWORD", {
    entityType: "User",
    entityId: userId,
    branchId: targetBranchId,
    metadata: { targetName: target.name },
  });

  return { ok: true };
}

export async function getTeamsForAdmin(
  branchIdFilter?: string | null,
  options?: { limit?: number; offset?: number }
): Promise<{ teams: { id: string; name: string; branchId: string | null; branchName: string | null }[]; total: number }> {
  const session = await authorize(["ADMIN", "BRANCH_MANAGER"] as Role[], "getTeamsForAdmin");
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
  const offset = Math.max(options?.offset ?? 0, 0);
  const where =
    session.role === "BRANCH_MANAGER" && session.branchId
      ? { branchId: session.branchId }
      : session.role === "ADMIN" && branchIdFilter != null
        ? { branchId: branchIdFilter }
        : undefined;

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        branchId: true,
        branch: { select: { name: true } },
      },
    }),
    prisma.team.count({ where: where ?? {} }),
  ]);

  return {
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      branchId: t.branchId,
      branchName: t.branch?.name ?? null,
    })),
    total,
  };
}

/** Branches from DB for admin dropdowns (users, missions). Returns DB branches. */
export async function getBranchesForAdmin(): Promise<{ id: string; branchCode: string | null; companyName: string }[]> {
  const branches = await branchesService.getBranchesFromDb();
  return branches.map((b) => ({
    id: b.id,
    branchCode: b.branchCode,
    companyName: b.name,
  }));
}

