"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { TerritoryCellWithCoords, AdminBranchTerritory } from "@/app/actions/branch-territory";
import type { MapZoneStatus } from "@/lib/zoneStatusColors";

import { PortalLoadingInline } from "@/components/ui/portal-loading";

const LeafletMapView = dynamic(
  () => import("./MapViewClient").then((m) => ({ default: m.MapViewClient })),
  { ssr: false, loading: () => <MapLoading /> }
);

const GoogleMapView = dynamic(
  () => import("./GoogleMapViewClient").then((m) => ({ default: m.GoogleMapViewClient })),
  { ssr: false, loading: () => <MapLoading /> }
);

function MapLoading() {
  return (
    <div className="flex h-full w-full min-h-[400px] items-center justify-center bg-black/40" style={{ minHeight: "60vh" }}>
      <PortalLoadingInline className="min-h-[200px] w-full max-w-xs" />
    </div>
  );
}

/** Renders Google Map when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, else Leaflet (OSM). */
export function MapScreen({
  useGoogleMaps = false,
  zoneCount = 0,
  merchantCount = 0,
  branchId = null,
  branchTerritory = null,
  territoryCells = [],
  isBranchManager = false,
  onSaveTerritory,
  onUpdateCell,
  adminTerritories,
  onTerritoryEditModeChange: onTerritoryEditModeChangeFromParent,
}: {
  useGoogleMaps?: boolean;
  zoneCount?: number;
  merchantCount?: number;
  branchId?: string | null;
  branchTerritory?: { lat: number; lng: number }[] | null;
  territoryCells?: TerritoryCellWithCoords[];
  isBranchManager?: boolean;
  onSaveTerritory?: (points: { lat: number; lng: number }[]) => Promise<void>;
  onUpdateCell?: (cellId: string, data: { status?: MapZoneStatus; label?: string | null }) => Promise<void>;
  adminTerritories?: AdminBranchTerritory[];
  onTerritoryEditModeChange?: (active: boolean) => void;
}) {
  const [territoryEditModeActiveLocal, setTerritoryEditModeActiveLocal] = useState(false);
  const onTerritoryEditModeChange = onTerritoryEditModeChangeFromParent ?? ((active: boolean) => setTerritoryEditModeActiveLocal(active));
  const mapProps = {
    zoneCount,
    merchantCount,
    branchId,
    branchTerritory,
    territoryCells,
    isBranchManager,
    onSaveTerritory,
    onUpdateCell,
    adminTerritories,
    onTerritoryEditModeChange,
  };
  const mapMinHeight = onTerritoryEditModeChangeFromParent
    ? "100%"
    : (territoryEditModeActiveLocal ? "85vh" : "60vh");
  return (
    <div className="h-full w-full min-h-[400px]" style={{ minHeight: mapMinHeight }}>
      {useGoogleMaps ? (
        <GoogleMapView {...mapProps} />
      ) : (
        <LeafletMapView {...mapProps} />
      )}
    </div>
  );
}
