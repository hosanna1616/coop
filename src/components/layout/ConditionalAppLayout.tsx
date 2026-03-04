"use client";

import { usePathname } from "next/navigation";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { SidebarLayout } from "@/components/layout/SidebarLayout";
import { useUserRole } from "@/contexts/UserRoleContext";

export function ConditionalAppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role } = useUserRole();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const useSidebar = role === "ADMIN" || role === "BRANCH_MANAGER";
  return useSidebar ? (
    <SidebarLayout>{children}</SidebarLayout>
  ) : (
    <MobileLayout>{children}</MobileLayout>
  );
}
