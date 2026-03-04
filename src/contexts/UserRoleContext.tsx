"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AuthSession } from "@/lib/auth";

type UserRoleContextValue = {
  userId: string | null;
  role: AuthSession["role"] | null;
  branchId: string | null;
};

const UserRoleContext = createContext<UserRoleContextValue | null>(null);

export function UserRoleProvider({
  initialSession,
  children,
}: {
  initialSession: AuthSession | null;
  children: ReactNode;
}) {
  const value = useMemo<UserRoleContextValue>(
    () =>
      initialSession
        ? {
            userId: initialSession.id,
            role: initialSession.role,
            branchId: initialSession.branchId,
          }
        : { userId: null, role: null, branchId: null },
    [initialSession]
  );

  return (
    <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
  );
}

export function useUserRole(): UserRoleContextValue {
  const ctx = useContext(UserRoleContext);
  if (ctx === null) {
    return { userId: null, role: null, branchId: null };
  }
  return ctx;
}
