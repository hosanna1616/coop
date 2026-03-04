"use client";

import dynamic from "next/dynamic";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

export const MapView = dynamic(() => import("./MapViewClient").then((m) => ({ default: m.MapViewClient })), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[300px] items-center justify-center bg-black/40">
      <PortalLoadingInline className="min-h-[180px] w-full max-w-xs" />
    </div>
  ),
});
