"use client";

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
                <img
                  src={selectedPin.data.photoUrl}
                  alt={selectedPin.data.businessName}
                  className="h-32 w-full rounded-lg border border-border object-cover"
                />
              </div>
            )}
            <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 font-mono text-sm">
              <dt className="text-muted-foreground">Business</dt>
              <dd className="font-medium">{selectedPin.data.businessName}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium">{selectedPin.data.category}</dd>
              <dt className="text-muted-foreground">Volume</dt>
              <dd className="font-medium">{selectedPin.data.estimatedVolume}</dd>
              <dt className="text-muted-foreground">Location</dt>
              <dd className="font-medium">
                {selectedPin.data.locationLat.toFixed(5)}, {selectedPin.data.locationLng.toFixed(5)}
              </dd>
              <dt className="text-muted-foreground">Scouted by</dt>
              <dd className="font-medium">{selectedPin.data.scoutedBy.name}</dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{new Date(selectedPin.data.createdAt).toLocaleString()}</dd>
            </dl>
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
            <Card className="border-border bg-card">
              <CardContent className="pt-4">
                {(merchantDetail.lead?.photoUrl || merchantDetail.oathSignatureUrl) && (
                  <div className="mb-4 flex flex-wrap gap-4">
                    {merchantDetail.lead?.photoUrl && (
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">Business photo</p>
                        <img
                          src={merchantDetail.lead.photoUrl}
                          alt=""
                          className="h-32 w-32 rounded-lg border border-border object-cover"
                        />
                      </div>
                    )}
                    {merchantDetail.oathSignatureUrl && (
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">Signature</p>
                        <img
                          src={merchantDetail.oathSignatureUrl}
                          alt=""
                          className="h-24 w-40 rounded border border-border object-contain"
                        />
                      </div>
                    )}
                  </div>
                )}
                <dl className="grid grid-cols-[minmax(6rem,auto)_1fr] gap-x-3 gap-y-1 font-mono text-sm">
                  <dt className="text-muted-foreground">Owner</dt>
                  <dd className="font-medium">{merchantDetail.ownerName}</dd>
                  <dt className="text-muted-foreground">Citizen #</dt>
                  <dd className="font-medium">{merchantDetail.citizenNumber}</dd>
                  <dt className="text-muted-foreground">Phone</dt>
                  <dd className="font-medium">{merchantDetail.phoneNumber}</dd>
                  <dt className="text-muted-foreground">Deployment assets</dt>
                  <dd className="font-medium">
                    {merchantDetail.deploymentAssets?.length
                      ? merchantDetail.deploymentAssets.map((a) => a.displayName).join(", ")
                      : "None"}
                  </dd>
                  <dt className="text-muted-foreground">Inducted by</dt>
                  <dd className="font-medium">{merchantDetail.inductedBy.name}</dd>
                  <dt className="text-muted-foreground">Onboarded</dt>
                  <dd className="font-medium">{new Date(merchantDetail.onboardingDate).toLocaleDateString()}</dd>
                  {merchantDetail.lead && (
                    <>
                      <dt className="col-span-2 mt-2 border-t border-border pt-2 text-muted-foreground">Lead</dt>
                      <dd className="col-span-2" />
                      <dt className="text-muted-foreground">Business</dt>
                      <dd className="font-medium">{merchantDetail.lead.businessName}</dd>
                      <dt className="text-muted-foreground">Category</dt>
                      <dd className="font-medium">{merchantDetail.lead.category}</dd>
                      <dt className="text-muted-foreground">Location</dt>
                      <dd className="font-medium">
                        {merchantDetail.lead.locationLat.toFixed(5)}, {merchantDetail.lead.locationLng.toFixed(5)}
                      </dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>
          ) : (
            <p className="font-mono text-sm text-muted-foreground">Merchant not found.</p>
          )}
        </>
      )}
    </div>
  );
}
