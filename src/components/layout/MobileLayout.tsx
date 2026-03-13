"use client";

import { BottomNav } from "@/components/bottom-nav";

export function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <main className="min-h-0 min-w-0 flex-1 w-full pb-20 safe-area-inset-bottom">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
