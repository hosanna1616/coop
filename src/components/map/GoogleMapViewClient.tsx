"use client";

import { useCallback, useEffect, useMemo, useState, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleMap,
  useJsApiLoader,
  Polygon,
  Marker,
  useGoogleMap,
} from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { generateZoneGrid, ADDIS_ABABA_CENTER, type GridCell } from "@/lib/zoneGrid";
import { normalizeTerritoryPoints } from "@/lib/territoryGrid";
import { getZones, updateZoneStatus, type ZoneWithStats } from "@/app/actions/zones";
import { ZONE_STATUS_COLORS, ZONE_STATUS_LABELS, type MapZoneStatus } from "@/lib/zoneStatusColors";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScoutReportForm } from "@/components/forms/scout-report-form";
import { ZoneDrawer, type ZoneStatus } from "@/components/zone-drawer";
import { TerritoryCellDrawer } from "./TerritoryCellDrawer";
import { PlayerCellDrawer } from "./PlayerCellDrawer";
import { MapOverlay } from "./MapOverlay";
import { useUserRole } from "@/contexts/UserRoleContext";
import type { SelectedZone } from "./types";
import type { TerritoryCellWithCoords, AdminBranchTerritory, TerritoryCellWithBranchName } from "@/app/actions/branch-territory";
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import { getMapPins, type MapPinScouted, type MapPinInducted } from "@/app/actions/map-pins";
import { getMerchantDetail, type MerchantDetail } from "@/app/actions/merchants";
import { MapPinDetailDrawer } from "./MapPinDetailDrawer";

const PIN_CLUSTER_RADIUS_DEG = 0.00008;

/** Spread pins that share the same position so multiple merchants in one cell are all visible. */
function spreadPinPositions<T extends { locationLat: number; locationLng: number }>(
  pins: T[]
): { pin: T; lat: number; lng: number }[] {
  const key = (lat: number, lng: number) => `${lat.toFixed(6)},${lng.toFixed(6)}`;
  const groups = new Map<string, T[]>();
  for (const pin of pins) {
    const k = key(pin.locationLat, pin.locationLng);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(pin);
  }
  const result: { pin: T; lat: number; lng: number }[] = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      result.push({ pin: group[0], lat: group[0].locationLat, lng: group[0].locationLng });
    } else {
      group.forEach((p, i) => {
        const angle = (i / group.length) * 2 * Math.PI;
        result.push({
          pin: p,
          lat: p.locationLat + PIN_CLUSTER_RADIUS_DEG * Math.cos(angle),
          lng: p.locationLng + PIN_CLUSTER_RADIUS_DEG * Math.sin(angle),
        });
      });
    }
  }
  return result;
}

const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: true,
};

function MyLocationButton({ onCenter }: { onCenter: () => void }) {
  return (
    <button
      type="button"
      onClick={onCenter}
      className="absolute bottom-24 right-4 z-10 flex size-12 items-center justify-center rounded-full border border-border bg-card shadow-lg transition hover:bg-muted"
      aria-label="Center on my location"
    >
      <MapPin className="size-6 text-primary" />
    </button>
  );
}

function AdminTerritoryContentGoogle({
  adminTerritories,
  onCellClick,
}: {
  adminTerritories: AdminBranchTerritory[];
  onCellClick: (
    cell: TerritoryCellWithBranchName,
    tapPosition?: { lat: number; lng: number }
  ) => void;
}) {
  return (
    <>
      {adminTerritories.map((branch) => (
        <Fragment key={branch.branchId}>
          {branch.territoryBounds.length >= 3 && (
            <Polygon
              paths={branch.territoryBounds.map((p) => ({ lat: p.lat, lng: p.lng }))}
              options={{
                strokeColor: "#6366f1",
                strokeWeight: 2,
                fillColor: "#6366f1",
                fillOpacity: 0.12,
                clickable: false,
              }}
            />
          )}
          {branch.cells.map((cell) => {
            const status = (cell.status as MapZoneStatus) || "UNSEEN";
            const fill = ZONE_STATUS_COLORS[status];
            const path = cell.coordinates.map((p) => ({ lat: p.lat, lng: p.lng }));
            return (
              <Polygon
                key={cell.id}
                paths={path}
                options={{
                  strokeColor: "#374151",
                  strokeWeight: 1,
                  fillColor: fill,
                  fillOpacity: 0.6,
                  clickable: true,
                }}
                onClick={(e) =>
                  onCellClick(
                    cell,
                    e?.latLng
                      ? { lat: e.latLng.lat(), lng: e.latLng.lng() }
                      : undefined
                  )
                }
              />
            );
          })}
        </Fragment>
      ))}
    </>
  );
}

function TerritoryContentGoogle({
  branchTerritory,
  territoryCells,
  isBranchManager,
  boundaryPreview,
  onCellClick,
  isEditMode = false,
  onBoundaryPathChange,
}: {
  branchTerritory: { lat: number; lng: number }[] | null;
  territoryCells: TerritoryCellWithCoords[];
  isBranchManager: boolean;
  boundaryPreview: { lat: number; lng: number }[];
  onCellClick: (
    cell: TerritoryCellWithCoords,
    tapPosition?: { lat: number; lng: number }
  ) => void;
  isEditMode?: boolean;
  onBoundaryPathChange?: (path: { lat: number; lng: number }[]) => void;
}) {
  const boundaryToShow = boundaryPreview.length >= 3 ? boundaryPreview : branchTerritory;
  const showBoundary = boundaryToShow && boundaryToShow.length >= 3;

  const handlePolygonLoad = useCallback(
    (polygon: google.maps.Polygon) => {
      if (!onBoundaryPathChange) return;
      const path = polygon.getPath();
      const sync = () => {
        const arr: { lat: number; lng: number }[] = [];
        for (let i = 0; i < path.getLength(); i++) {
          const ll = path.getAt(i);
          arr.push({ lat: ll.lat(), lng: ll.lng() });
        }
        onBoundaryPathChange(arr);
      };
      path.addListener("set_at", sync);
      path.addListener("insert_at", sync);
      path.addListener("remove_at", sync);
    },
    [onBoundaryPathChange]
  );

  return (
    <>
      {showBoundary && (
        <Polygon
          paths={boundaryToShow.map((p) => ({ lat: p.lat, lng: p.lng }))}
          options={{
            strokeColor: "#6366f1",
            strokeWeight: 2,
            fillColor: "#6366f1",
            fillOpacity: 0.15,
            clickable: false,
            editable: isEditMode,
            draggable: isEditMode,
          }}
          onLoad={isEditMode ? handlePolygonLoad : undefined}
        />
      )}
      {territoryCells.map((cell) => {
        const status = (cell.status as MapZoneStatus) || "UNSEEN";
        const fill = ZONE_STATUS_COLORS[status];
        const path = cell.coordinates.map((p) => ({ lat: p.lat, lng: p.lng }));
        return (
          <Polygon
            key={cell.id}
            paths={path}
            options={{
              strokeColor: "#374151",
              strokeWeight: 1,
              fillColor: fill,
              fillOpacity: 0.6,
              clickable: true,
            }}
            onClick={(e) =>
              onCellClick(
                cell,
                e?.latLng
                  ? { lat: e.latLng.lat(), lng: e.latLng.lng() }
                  : undefined
              )
            }
          />
        );
      })}
    </>
  );
}

export function GoogleMapViewClient({
  zoneCount = 0,
  merchantCount = 0,
  branchId = null,
  branchTerritory = null,
  territoryCells = [],
  isBranchManager = false,
  onSaveTerritory,
  onUpdateCell,
  adminTerritories = [],
  onTerritoryEditModeChange,
}: {
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
} = {}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [zones, setZones] = useState<ZoneWithStats[]>([]);
  const [selected, setSelected] = useState<SelectedZone | null>(null);
  const [selectedTerritoryCell, setSelectedTerritoryCell] = useState<TerritoryCellWithCoords | TerritoryCellWithBranchName | null>(null);
  const [tapPosition, setTapPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<"details" | "scout-form">("details");
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [boundaryPoints, setBoundaryPoints] = useState<{ lat: number; lng: number }[]>([]);
  const [isEditingBoundary, setIsEditingBoundary] = useState(false);
  const [savingTerritory, setSavingTerritory] = useState(false);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<MapZoneStatus>>(
    () => new Set(ZONE_STATUS_LABELS)
  );
  const { role: userRole } = useUserRole();

  const [mapPins, setMapPins] = useState<{ scouted: MapPinScouted[]; inducted: MapPinInducted[] } | null>(null);
  const [selectedPin, setSelectedPin] = useState<
    | { type: "scouted"; data: MapPinScouted }
    | { type: "inducted"; id: string }
    | null
  >(null);
  const [merchantDetailForPin, setMerchantDetailForPin] = useState<MerchantDetail | null>(null);
  const [pinDetailLoading, setPinDetailLoading] = useState(false);

  const inDefineMode = isBranchManager && !branchTerritory && !isEditingBoundary;
  const inEditBoundaryMode = isBranchManager && branchTerritory && isEditingBoundary;
  const mapClickEnabled = inDefineMode;
  const pointsToSave = boundaryPoints;

  useEffect(() => {
    if (inEditBoundaryMode && branchTerritory && boundaryPoints.length === 0) {
      setBoundaryPoints([...branchTerritory]);
    }
  }, [inEditBoundaryMode, branchTerritory]);

  useEffect(() => {
    onTerritoryEditModeChange?.(inDefineMode || inEditBoundaryMode);
  }, [inDefineMode, inEditBoundaryMode, onTerritoryEditModeChange]);

  const apiKey = typeof window !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY : undefined;
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey ?? "",
  });

  useEffect(() => {
    (async () => {
      try {
        const list = await getZones(branchId ?? undefined);
        setZones(list);
      } catch {
        setZones([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [branchId]);

  const showPins = userRole === "ADMIN" || userRole === "BRANCH_MANAGER" || userRole === "PLAYER";
  const refetchMapPins = useCallback(() => {
    if (!showPins) return;
    getMapPins(branchId ?? null).then((p) => setMapPins(p)).catch(() => setMapPins(null));
  }, [showPins, branchId]);
  useEffect(() => {
    if (!showPins) {
      setMapPins(null);
      return;
    }
    refetchMapPins();
  }, [showPins, branchId, refetchMapPins]);

  const spreadScouted = useMemo(
    () => (mapPins ? spreadPinPositions(mapPins.scouted) : []),
    [mapPins]
  );
  const spreadInducted = useMemo(
    () => (mapPins ? spreadPinPositions(mapPins.inducted) : []),
    [mapPins]
  );

  const { cells, zoneByCode } = useMemo(() => {
    const cells = generateZoneGrid(
      ADDIS_ABABA_CENTER.lat,
      ADDIS_ABABA_CENTER.lng,
      500,
      11
    );
    const zoneByCode = new Map(zones.map((z) => [z.code, z]));
    return { cells, zoneByCode };
  }, [zones]);

  const mapCenter = useMemo(() => {
    if (branchTerritory && branchTerritory.length > 0) {
      const sum = branchTerritory.reduce(
        (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
        { lat: 0, lng: 0 }
      );
      return {
        lat: sum.lat / branchTerritory.length,
        lng: sum.lng / branchTerritory.length,
      };
    }
    return ADDIS_ABABA_CENTER;
  }, [branchTerritory]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!mapClickEnabled || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      if (inDefineMode) {
        setBoundaryPoints((prev) => [...prev, { lat, lng }]);
      } else if (inEditBoundaryMode) {
        setBoundaryPoints((prev) => [...prev, { lat, lng }]);
      }
    },
    [mapClickEnabled, inDefineMode, inEditBoundaryMode]
  );

  const handleSaveTerritory = useCallback(async () => {
    if (!onSaveTerritory || pointsToSave.length < 4) return;
    setSavingTerritory(true);
    try {
      const normalized = normalizeTerritoryPoints(pointsToSave);
      await onSaveTerritory(normalized);
      setBoundaryPoints([]);
      setIsEditingBoundary(false);
    } finally {
      setSavingTerritory(false);
    }
  }, [onSaveTerritory, pointsToSave]);

  const handleCancelBoundary = useCallback(() => {
    setBoundaryPoints([]);
    setIsEditingBoundary(false);
  }, []);

  const handleZoneClick = useCallback((sel: SelectedZone) => {
    setSelectedTerritoryCell(null);
    setSelectedPin(null);
    setSelected(sel);
    setView("details");
  }, []);

  const handleTerritoryCellClick = useCallback(
    (
      cell: TerritoryCellWithCoords | TerritoryCellWithBranchName,
      clickedPosition?: { lat: number; lng: number }
    ) => {
      setSelected(null);
      setSelectedPin(null);
      setSelectedTerritoryCell(cell);
      if (clickedPosition) setTapPosition(clickedPosition);
    },
    []
  );

  const openScoutForm = useCallback(() => {
    setView("scout-form");
  }, []);

  const closeDrawer = useCallback(() => {
    setSelected(null);
    setSelectedTerritoryCell(null);
    setSelectedPin(null);
    setMerchantDetailForPin(null);
    setView("details");
  }, []);

  const zoneIdForSelectedCell =
    selectedTerritoryCell && zones.length > 0
      ? zones.find((z) => z.code === selectedTerritoryCell.code)?.id ?? null
      : null;
  const cellCenter =
    selectedTerritoryCell && selectedTerritoryCell.coordinates?.length > 0
      ? (() => {
          const c = selectedTerritoryCell.coordinates;
          const sum = c.reduce(
            (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
            { lat: 0, lng: 0 }
          );
          return { lat: sum.lat / c.length, lng: sum.lng / c.length };
        })()
      : null;
  const openScoutFormFromCell = useCallback(() => setView("scout-form"), []);

  useEffect(() => {
    if (selectedPin?.type === "inducted" && selectedPin.id) {
      setPinDetailLoading(true);
      setMerchantDetailForPin(null);
      getMerchantDetail(selectedPin.id).then((d) => {
        setMerchantDetailForPin(d ?? null);
      }).finally(() => setPinDetailLoading(false));
    } else {
      setMerchantDetailForPin(null);
    }
  }, [selectedPin?.type, selectedPin?.id]);

  const handleUpdateCell = useCallback(
    async (data: { status: MapZoneStatus; label: string | null }) => {
      if (!selectedTerritoryCell || !onUpdateCell) return;
      await onUpdateCell(selectedTerritoryCell.id, data);
    },
    [selectedTerritoryCell, onUpdateCell]
  );

  const refetchZones = useCallback(async () => {
    try {
      const list = await getZones(branchId ?? undefined);
      setZones(list);
    } catch {
      // keep current
    }
  }, [branchId]);

  const handleOverrideStatus = useCallback(
    async (newStatus: ZoneStatus) => {
      if (!selected?.zone?.id) return;
      await updateZoneStatus(selected.zone.id, newStatus);
      await refetchZones();
    },
    [selected?.zone?.id, refetchZones]
  );

  const centerOnUser = useCallback(() => {
    setLocationError(null);
    if (!navigator?.geolocation) {
      setLocationError("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        window.dispatchEvent(
          new CustomEvent("map-center-on", { detail: center })
        );
      },
      () => setLocationError("Location unavailable"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const statusLabel = selected?.zone ? selected.zone.status : "UNSEEN";
  const ownerName = selected?.zone?.ownerName ?? "—";
  const zoneId = selected?.zone?.id ?? null;
  const router = useRouter();
  const handleInduct = useCallback(() => {
    if (zoneId) router.push(`/induct/zone/${zoneId}`);
  }, [zoneId, router]);
  const selectedZoneMerchantCount = 0;
  const totalMerchantsForCapture = 10;
  const txVolume = "—";

  const mapOptions = useMemo(
    () => ({
      ...DEFAULT_MAP_OPTIONS,
      mapTypeId: mapType,
    }),
    [mapType]
  );

  if (loading || !apiKey) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-black/40 p-4">
        {!apiKey ? (
          <p className="text-muted-foreground text-center text-sm">
            Set <code className="rounded bg-muted px-1 py-0.5">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in .env to use Google Maps.
          </p>
        ) : (
          <PortalLoadingInline className="min-h-[180px] w-full max-w-xs" />
        )}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/30 p-4">
        <p className="text-destructive text-center text-sm">Failed to load Google Maps.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full min-h-[300px] items-center justify-center bg-black/40">
        <PortalLoadingInline className="min-h-[180px] w-full max-w-xs" />
      </div>
    );
  }

  const showEmptyState =
    userRole !== "ADMIN" &&
    adminTerritories.length === 0 &&
    !branchTerritory &&
    !isBranchManager;
  if (showEmptyState) {
    return (
      <div className="flex h-full w-full min-h-[400px] flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center">
        <p className="font-mono text-sm font-medium text-foreground">
          Your branch manager has not set your territory yet.
        </p>
        <p className="text-muted-foreground text-sm max-w-md">
          You will see the map here once they define the branch boundaries. Check back later or ask your branch manager.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        ref={mapContainerRef}
        className="relative h-full w-full min-h-0 flex-1"
      >
        {(inDefineMode || inEditBoundaryMode) && (
          <div className="absolute bottom-24 left-4 right-4 z-20 flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="font-mono text-sm text-foreground">
              {inDefineMode
                ? "Click 4+ points on the map to define your territory"
                : "Drag the boundary vertices to reshape the territory. Save when done."}
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              {pointsToSave.length} point{pointsToSave.length !== 1 ? "s" : ""} placed
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pointsToSave.length < 4 || savingTerritory}
                onClick={handleSaveTerritory}
              >
                {savingTerritory ? "Saving…" : "Save Territory"}
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancelBoundary}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%", minHeight: "100%" }}
          center={mapCenter}
          zoom={14}
          options={mapOptions}
          onClick={(e) => {
            if (mapClickEnabled) handleMapClick(e);
            else setSelected(null);
          }}
        >
          {adminTerritories.length > 0 && (
            <AdminTerritoryContentGoogle
              adminTerritories={adminTerritories}
              onCellClick={handleTerritoryCellClick}
            />
          )}
          {adminTerritories.length === 0 && branchTerritory && (
            <TerritoryContentGoogle
              branchTerritory={branchTerritory}
              territoryCells={territoryCells}
              isBranchManager={isBranchManager}
              boundaryPreview={
                inDefineMode
                  ? boundaryPoints
                  : inEditBoundaryMode
                    ? boundaryPoints
                    : []
              }
              onCellClick={handleTerritoryCellClick}
              isEditMode={inEditBoundaryMode}
              onBoundaryPathChange={inEditBoundaryMode ? setBoundaryPoints : undefined}
            />
          )}
          {adminTerritories.length === 0 && branchTerritory && branchTerritory.length >= 2 && (
            <FitMapToTerritoryGoogle points={branchTerritory} />
          )}
          {mapPins && (
            <>
              {spreadScouted.map(({ pin: lead, lat, lng }) => (
                <Marker
                  key={`scouted-${lead.id}`}
                  position={{ lat, lng }}
                  onClick={() => {
                    setSelected(null);
                    setSelectedTerritoryCell(null);
                    setSelectedPin({ type: "scouted", data: lead });
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#3b82f6",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 10,
                  }}
                  title={lead.businessName}
                />
              ))}
              {spreadInducted.map(({ pin: m, lat, lng }) => (
                <Marker
                  key={`inducted-${m.id}`}
                  position={{ lat, lng }}
                  onClick={() => {
                    setSelected(null);
                    setSelectedTerritoryCell(null);
                    setSelectedPin({ type: "inducted", id: m.id });
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: "#22c55e",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 10,
                  }}
                  title={m.businessName}
                />
              ))}
            </>
          )}
          <MapCenterHandler />
        </GoogleMap>

        <MapOverlay
          zoneCount={zoneCount}
          merchantCount={merchantCount}
          visibleStatuses={visibleStatuses}
          onVisibleStatusesChange={setVisibleStatuses}
          mapContainerRef={mapContainerRef}
          mapType={mapType}
          onMapTypeChange={setMapType}
          showEditTerritory={isBranchManager && !!branchTerritory}
          isEditingTerritory={isEditingBoundary}
          onEditTerritory={() => setIsEditingBoundary(true)}
          onCancelEditTerritory={handleCancelBoundary}
        />
        <MyLocationButton onCenter={centerOnUser} />

        {locationError && (
          <div className="absolute bottom-24 left-4 right-20 z-10 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 font-mono text-xs text-destructive">
            {locationError}
          </div>
        )}
      </div>

      <Drawer open={!!selected || !!selectedTerritoryCell || !!selectedPin} onOpenChange={(open) => !open && closeDrawer()} direction="bottom">
        <DrawerContent className="max-h-[85vh] flex flex-col border-t border-border bg-card text-card-foreground">
          <DrawerTitle className="sr-only">Zone, cell, or location details</DrawerTitle>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-24">
          {selectedPin && (
            <MapPinDetailDrawer
              selectedPin={selectedPin}
              merchantDetail={merchantDetailForPin}
              loading={pinDetailLoading}
              onClose={closeDrawer}
            />
          )}
          {!selectedPin && view === "details" && selected && (
            <ZoneDrawer
              isOpen={!!selected}
              onClose={closeDrawer}
              zoneCode={selected.cell.code}
              zoneId={zoneId}
              status={statusLabel}
              owner={ownerName}
              merchantCount={selectedZoneMerchantCount}
              totalMerchantsForCapture={totalMerchantsForCapture}
              txVolume={txVolume}
              userRole={userRole}
              onScout={statusLabel === "UNSEEN" ? openScoutForm : undefined}
              onInduct={statusLabel === "SCOUTED" || statusLabel === "CAPTURED" ? handleInduct : undefined}
              onOverrideStatus={handleOverrideStatus}
              embedded
            />
          )}
          {!selectedPin && view === "scout-form" && selected && (
            <ScoutReportForm
              zoneId={selected.zone?.id ?? null}
              zoneCode={selected.cell.code}
              branchId={branchId ?? undefined}
              coordinates={selected.cell.polygon}
              centerLat={tapPosition?.lat ?? selected.cell.centerLat}
              centerLng={tapPosition?.lng ?? selected.cell.centerLng}
              embedded
              onCancel={closeDrawer}
              onSuccess={async () => {
                await refetchZones();
                refetchMapPins();
                closeDrawer();
              }}
            />
          )}
          {!selectedPin && view === "scout-form" && selectedTerritoryCell && (
            <ScoutReportForm
              zoneId={zoneIdForSelectedCell}
              zoneCode={selectedTerritoryCell.code}
              branchId={branchId ?? undefined}
              coordinates={selectedTerritoryCell.coordinates}
              centerLat={tapPosition?.lat ?? cellCenter?.lat}
              centerLng={tapPosition?.lng ?? cellCenter?.lng}
              embedded
              onCancel={closeDrawer}
              onSuccess={async () => {
                await refetchZones();
                refetchMapPins();
                closeDrawer();
              }}
            />
          )}
          {!selectedPin && view === "details" && selectedTerritoryCell && (isBranchManager || userRole === "ADMIN") && (
            <TerritoryCellDrawer
              cell={selectedTerritoryCell}
              onClose={closeDrawer}
              onSave={"branchName" in selectedTerritoryCell ? undefined : handleUpdateCell}
              branchName={"branchName" in selectedTerritoryCell ? selectedTerritoryCell.branchName : undefined}
              branchId={("branchId" in selectedTerritoryCell ? selectedTerritoryCell.branchId : branchId) ?? undefined}
              readOnly={"branchName" in selectedTerritoryCell}
            />
          )}
          {!selectedPin && view === "details" && selectedTerritoryCell && userRole === "PLAYER" && (
            <PlayerCellDrawer
              cell={selectedTerritoryCell}
              zoneId={zoneIdForSelectedCell}
              cellStatus={selectedTerritoryCell.status as MapZoneStatus}
              branchId={"branchId" in selectedTerritoryCell ? selectedTerritoryCell.branchId : branchId}
              onClose={closeDrawer}
              onScout={openScoutFormFromCell}
              onInduct={zoneIdForSelectedCell ? () => router.push(`/induct/zone/${zoneIdForSelectedCell}`) : undefined}
            />
          )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

function MapCenterHandler() {
  const map = useGoogleMap();
  useEffect(() => {
    if (!map) return;
    const handler = (e: CustomEvent<{ lat: number; lng: number }>) => {
      map.panTo(e.detail);
      map.setZoom(16);
    };
    window.addEventListener("map-center-on", handler as EventListener);
    return () => window.removeEventListener("map-center-on", handler as EventListener);
  }, [map]);
  return null;
}

/** On first load, fit map bounds to branch territory (for BRANCH_MANAGER / PLAYER). */
function FitMapToTerritoryGoogle({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useGoogleMap();
  const done = useRef(false);
  useEffect(() => {
    if (!map || done.current || !points || points.length < 2) return;
    done.current = true;
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, { top: 24, right: 24, bottom: 24, left: 24 });
    const listener = map.addListener("idle", () => {
      const z = map.getZoom();
      if (z != null && z > 14) map.setZoom(14);
      google.maps.event.removeListener(listener);
    });
  }, [map, points]);
  return null;
}

function MapContent({
  cells,
  zoneByCode,
  onZoneClick,
  visibleStatuses,
}: {
  cells: GridCell[];
  zoneByCode: Map<string, ZoneWithStats>;
  onZoneClick: (sel: SelectedZone) => void;
  visibleStatuses: Set<MapZoneStatus>;
}) {
  return (
    <>
      {cells.map((cell) => {
        const zone = zoneByCode.get(cell.code) ?? null;
        const status = (zone?.status ?? "UNSEEN") as MapZoneStatus;
        if (!visibleStatuses.has(status)) return null;
        const path = cell.polygon.map((p) => ({ lat: p.lat, lng: p.lng }));
        return (
          <Polygon
            key={cell.code}
            paths={path}
            options={{
              strokeColor: "#374151",
              strokeWeight: 1,
              fillColor: ZONE_STATUS_COLORS[status],
              fillOpacity: 0.5,
              clickable: true,
            }}
            onClick={() => {
              onZoneClick({ cell, zone });
            }}
          />
        );
      })}
    </>
  );
}
