"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/contexts/UserRoleContext";
import { getNavItems } from "@/lib/nav-items";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

const SIDEBAR_WIDTH = 240;
const LOGO_PATH = "/images/Cooperative_Bank_of_Oromia.png";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role } = useUserRole();
  const navItems = getNavItems(role);

  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="Main">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-mono transition-colors",
              isActive
                ? "border-l-2 border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-dvh w-full bg-background">
      {/* Desktop sidebar: visible from md up */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-border bg-background md:flex"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Main navigation"
      >
        <div className="flex shrink-0 flex-col items-center gap-2 border-b border-border px-4 py-4">
          <Image
            src={LOGO_PATH}
            alt="Merchant Nation"
            width={120}
            height={64}
            className="h-auto w-full max-w-[140px] object-contain"
            priority
          />
          {/* <span className="font-mono text-sm font-semibold text-foreground">
            Merchant Nation
          </span> */}
        </div>
        <div className="flex-1 overflow-y-auto pt-2">
          <SidebarNav />
        </div>
      </aside>

      {/* Mobile: hamburger + drawer */}
      <div className="fixed left-0 top-0 z-40 flex h-14 items-center border-b border-border bg-background px-3 md:hidden">
        <Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} direction="left">
          <DrawerTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open menu"
              className="shrink-0"
            >
              <Menu className="size-6" />
            </Button>
          </DrawerTrigger>
          <DrawerContent
            className="h-full max-w-[280px] w-[85vw] rounded-none border-r"
            style={{ marginLeft: 0, marginTop: 0 }}
          >
            <DrawerHeader className="flex flex-col items-center gap-2 border-b border-border py-4">
              <Image
                src={LOGO_PATH}
                alt="Merchant Nation"
                width={120}
                height={64}
                className="h-auto w-full max-w-[140px] object-contain"
              />
              <DrawerTitle className="font-mono font-semibold">Merchant Nation</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
            </div>
          </DrawerContent>
        </Drawer>
        <span className="ml-2 font-mono text-sm font-medium text-foreground">
          Merchant Nation
        </span>
      </div>

      {/* Main content */}
      <main className="min-h-0 min-w-0 flex-1 w-full pt-14 md:pl-[240px] md:pt-0">
        <div className="min-h-dvh w-full max-w-full p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
