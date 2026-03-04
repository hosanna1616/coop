"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/contexts/UserRoleContext";
import { getNavItems } from "@/lib/nav-items";

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useUserRole();
  const navItems = getNavItems(role);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex bg-background"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-16 w-full flex-col items-center justify-center text-xs font-mono transition-colors",
              isActive
                ? "border-t-2 border-primary text-primary"
                : "text-muted-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-6 shrink-0" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
