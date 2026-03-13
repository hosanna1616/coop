"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import { X } from "lucide-react";
import type { MapPinScouted } from "@/app/actions/map-pins";
import type { MerchantDetail } from "@/app/actions/merchants";
import { MerchantDetailView } from "@/components/merchant-detail/MerchantDetailView";

function ImageFullscreen({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={caption ?? "Image fullscreen"}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 z-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="size-5" />
      </Button>
      <button
        type="button"
        className="flex max-h-full max-w-full flex-col items-center justify-center focus:outline-none"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[85vh] max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {caption && (
          <span className="mt-2 text-sm text-white/80">{caption}</span>
        )}
      </button>
    </div>
  );
}

export function MapPinDetailDrawer({
  selectedPin,
  merchantDetail,
  loading,
  onClose,
}: {
  selectedPin: { type: "scouted"; data: MapPinScouted } | { type: "inducted"; id: string };
  merchantDetail: MerchantDetail | null;
  loading: boolean;
  onClose: () => void;
}) {
  const [photoFullscreen, setPhotoFullscreen] = useState(false);
  return (
    <div className="flex flex-col gap-4 p-4">
      <DrawerHeader className="flex flex-row items-center justify-between gap-4 p-0 text-left">
        <DrawerTitle className="font-mono text-lg font-semibold text-foreground">
          {selectedPin.type === "scouted" ? "Scouted lead" : "Inducted merchant"}
        </DrawerTitle>
        <DrawerClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close">
            <X className="size-5" />
          </Button>
        </DrawerClose>
      </DrawerHeader>
      {selectedPin.type === "scouted" && (
        <Card className="border-border bg-card">
          <CardContent className="pt-4">
            {selectedPin.data.photoUrl && (
              <div className="mb-4">
                {photoFullscreen && (
                  <ImageFullscreen
                    src={selectedPin.data.photoUrl}
                    alt={selectedPin.data.businessName}
                    caption={selectedPin.data.businessName}
                    onClose={() => setPhotoFullscreen(false)}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setPhotoFullscreen(true)}
                  className="cursor-zoom-in w-full rounded-lg border border-border transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <img
                    src={selectedPin.data.photoUrl}
                    alt={selectedPin.data.businessName}
                    className="h-32 w-full rounded-lg object-cover"
                  />
                </button>
              </div>
            )}
            <div className="space-y-0">
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Business</span>
                <span className="text-sm font-medium text-foreground">{selectedPin.data.businessName}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</span>
                <span className="text-sm font-medium text-foreground">{selectedPin.data.category}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Volume</span>
                <span className="text-sm font-medium text-foreground">{selectedPin.data.estimatedVolume}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</span>
                <span className="text-sm font-medium text-foreground">
                  {selectedPin.data.locationLat.toFixed(5)}, {selectedPin.data.locationLng.toFixed(5)}
                </span>
              </div>
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Scouted by</span>
                <span className="text-sm font-medium text-foreground">{selectedPin.data.scoutedBy.name}</span>
              </div>
              <div className="flex flex-col gap-0.5 py-2">
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</span>
                <span className="text-sm font-medium text-foreground">{new Date(selectedPin.data.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {selectedPin.type === "inducted" && (
        <>
          {loading ? (
            <div className="min-h-[120px]">
              <PortalLoadingInline className="min-h-[120px]" />
            </div>
          ) : merchantDetail ? (
            <MerchantDetailView detail={merchantDetail} fullDeploymentAssets />
          ) : (
            <p className="font-mono text-sm text-muted-foreground">Merchant not found.</p>
          )}
        </>
      )}
    </div>
  );
}
