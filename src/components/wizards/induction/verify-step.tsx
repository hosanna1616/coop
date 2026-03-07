"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateLeadLocation } from "@/app/actions/leads";

export interface VerifyStepProps {
  leadId: string;
  lead: {
    businessName: string;
    category: string;
    locationLat: number;
    locationLng: number;
    zone?: { code: string } | null;
  };
  onContinue: () => void;
  /** When provided, show "Save and continue later" (saves progress and leaves). */
  onSaveProgress?: () => void | Promise<void>;
  /** When true, disable Save and continue later (e.g. while saving). */
  saving?: boolean;
}

type LocationChoice = "map" | "device" | null;

export function VerifyStep({ leadId, lead, onContinue, onSaveProgress, saving }: VerifyStepProps) {
  const [locationChoice, setLocationChoice] = useState<LocationChoice>(null);
  const [deviceLocation, setDeviceLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (locationChoice !== "device") return;
    setLoadingGeo(true);
    setGeoError(null);
    if (!navigator?.geolocation) {
      setGeoError("Geolocation not supported");
      setLoadingGeo(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingGeo(false);
      },
      () => {
        setGeoError("Location blocked or unavailable");
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [locationChoice]);

  const handleContinue = async () => {
    if (locationChoice === "device" && deviceLocation) {
      setSubmitting(true);
      try {
        const result = await updateLeadLocation(leadId, deviceLocation.lat, deviceLocation.lng);
        if (!result.ok) {
          setGeoError(result.error ?? "Failed to update location");
          setSubmitting(false);
          return;
        }
      } catch {
        setGeoError("Failed to update location");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }
    onContinue();
  };

  const canContinue =
    locationChoice === "map" || (locationChoice === "device" && deviceLocation != null && !loadingGeo);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify business details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          <strong>Business Name:</strong> {lead.businessName}
        </p>
        <p>
          <strong>Category:</strong> {lead.category}
        </p>
        <p>
          <strong>Zone:</strong> {lead.zone?.code ?? "—"}
        </p>

        <div className="space-y-3">
          <p className="font-medium text-foreground">Where should we record this merchant&apos;s location?</p>
          <p className="text-muted-foreground text-xs">
            Choose the location that will be shown on the map for this merchant.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto flex-col items-start gap-1 p-4 text-left",
                locationChoice === "map" && "border-primary ring-2 ring-primary"
              )}
              onClick={() => setLocationChoice("map")}
            >
              <span className="flex items-center gap-2 font-medium">
                <MapPin className="size-4 shrink-0" />
                Use location from the map
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                The place I pressed when I scouted (or the scout location)
              </span>
              {locationChoice === "map" && (
                <span className="mt-1 font-mono text-xs">
                  {lead.locationLat.toFixed(5)}, {lead.locationLng.toFixed(5)}
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-auto flex-col items-start gap-1 p-4 text-left",
                locationChoice === "device" && "border-primary ring-2 ring-primary"
              )}
              onClick={() => setLocationChoice("device")}
              disabled={loadingGeo}
            >
              <span className="flex items-center gap-2 font-medium">
                <Smartphone className="size-4 shrink-0" />
                Use my current location
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                GPS from this device right now
              </span>
              {loadingGeo && (
                <span className="mt-1 text-muted-foreground text-xs">Getting location…</span>
              )}
              {locationChoice === "device" && deviceLocation && !loadingGeo && (
                <span className="mt-1 font-mono text-xs">
                  {deviceLocation.lat.toFixed(5)}, {deviceLocation.lng.toFixed(5)}
                </span>
              )}
            </Button>
          </div>
          {locationChoice === "map" && (
            <p className="text-muted-foreground text-xs">
              Current scout/map location: {lead.locationLat.toFixed(5)}, {lead.locationLng.toFixed(5)}
            </p>
          )}
          {geoError && (
            <p className="text-destructive text-xs">{geoError}</p>
          )}
        </div>

        <Button
          type="button"
          onClick={handleContinue}
          className="min-h-[44px] w-full"
          disabled={!canContinue || submitting}
        >
          {submitting ? "Saving…" : "Looks good, continue"}
        </Button>
        {onSaveProgress && (
          <Button
            type="button"
            variant="outline"
            className="min-h-[44px] w-full"
            onClick={() => onSaveProgress()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save and continue later"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
