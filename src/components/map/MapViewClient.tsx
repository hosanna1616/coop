"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, Polygon, TileLayer, useMap, useMapEvents, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet-defaulticon-compatibility";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
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
import { PortalLoadingInline } from "@/components/ui/portal-loading";
import type { SelectedZone } from "./types";
import type { TerritoryCellWithCoords, AdminBranchTerritory, TerritoryCellWithBranchName } from "@/app/actions/branch-territory";
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

export type { SelectedZone };

function MapContent({
  zoneByCode,
  cells,
  onZoneClick,
  visibleStatuses,
}: {
  zoneByCode: Map<string, ZoneWithStats>;
  cells: GridCell[];
  onZoneClick: (sel: SelectedZone) => void;
  visibleStatuses: Set<MapZoneStatus>;
}) {
  return (
    <>
      {cells.map((cell) => {
        const zone = zoneByCode.get(cell.code) ?? null;
        const status = (zone?.status ?? "UNSEEN") as MapZoneStatus;
        if (!visibleStatuses.has(status)) return null;
        const fill = ZONE_STATUS_COLORS[status];
        const pos = cell.polygon.map((p) => [p.lat, p.lng] as [number, number]);
        return (
          <Polygon
            key={cell.code}
            positions={pos}
            pathOptions={{
              color: "#374151",
              weight: 1,
              fillColor: fill,
              fillOpacity: 0.6,
            }}
            eventHandlers={{
              click: () => onZoneClick({ cell, zone }),
            }}
          />
        );
      })}
    </>
  );
}

function MapSizeFix() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/** On first load, fit map bounds to branch territory (for BRANCH_MANAGER / PLAYER). */
function FitMapToTerritory({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !points || points.length < 2) return;
    done.current = true;
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, points]);
  return null;
}

function MapClickCapture({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (!enabled) return;
      const { lat, lng } = e.latlng;
      onMapClick(lat, lng);
    },
  });
  return null;
}

function AdminTerritoryContent({
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
              positions={branch.territoryBounds.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#6366f1",
                weight: 2,
                fillColor: "#6366f1",
                fillOpacity: 0.12,
              }}
            />
          )}
          {branch.cells.map((cell) => {
            const status = (cell.status as MapZoneStatus) || "UNSEEN";
            const fill = ZONE_STATUS_COLORS[status];
            const pos = cell.coordinates.map((p) => [p.lat, p.lng] as [number, number]);
            return (
              <Polygon
                key={cell.id}
                positions={pos}
                pathOptions={{
                  color: "#374151",
                  weight: 1,
                  fillColor: fill,
                  fillOpacity: 0.6,
                }}
                eventHandlers={{
                  click: (e) =>
                    onCellClick(cell, {
                      lat: e.latlng.lat,
                      lng: e.latlng.lng,
                    }),
                }}
              />
            );
          })}
        </Fragment>
      ))}
    </>
  );
}

function TerritoryContent({
  branchTerritory,
  territoryCells,
  isBranchManager,
  boundaryPreview,
  onCellClick,
  isEditMode = false,
  onVertexDrag,
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
  onVertexDrag?: (index: number, point: { lat: number; lng: number }) => void;
}) {
  const boundaryToShow = boundaryPreview.length >= 3 ? boundaryPreview : branchTerritory;
  const showBoundary = boundaryToShow && boundaryToShow.length >= 3;

  return (
    <>
      {showBoundary && (
        <Polygon
          positions={boundaryToShow.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{
            color: "#6366f1",
            weight: 2,
            fillColor: "#6366f1",
            fillOpacity: 0.15,
          }}
        />
      )}
      {isEditMode && boundaryToShow && boundaryToShow.length >= 3 && onVertexDrag &&
        boundaryToShow.map((p, i) => (
          <Marker
            key={`vertex-${i}`}
            position={[p.lat, p.lng]}
            draggable
            eventHandlers={{
              dragend(e) {
                const { lat, lng } = e.target.getLatLng();
                onVertexDrag(i, { lat, lng });
              },
            }}
          />
        ))}
      {territoryCells.map((cell) => {
        const status = (cell.status as MapZoneStatus) || "UNSEEN";
        const fill = ZONE_STATUS_COLORS[status];
        const pos = cell.coordinates.map((p) => [p.lat, p.lng] as [number, number]);
        return (
          <Polygon
            key={cell.id}
            positions={pos}
            pathOptions={{
              color: "#374151",
              weight: 1,
              fillColor: fill,
              fillOpacity: 0.6,
            }}
            eventHandlers={{
              click: (e) =>
                onCellClick(cell, {
                  lat: e.latlng.lat,
                  lng: e.latlng.lng,
                }),
            }}
          />
        );
      })}
    </>
  );
}

export function MapViewClient({
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
  onUpdateCell?: (cellId: string, data: { status?: string; label?: string | null }) => Promise<void>;
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

  const handleVertexDrag = useCallback((index: number, point: { lat: number; lng: number }) => {
    setBoundaryPoints((prev) => {
      const next = [...prev];
      next[index] = point;
      return next;
    });
  }, []);

  useEffect(() => {
    if (inEditBoundaryMode && branchTerritory && boundaryPoints.length === 0) {
      setBoundaryPoints([...branchTerritory]);
    }
  }, [inEditBoundaryMode, branchTerritory]);

  useEffect(() => {
    onTerritoryEditModeChange?.(inDefineMode || inEditBoundaryMode);
  }, [inDefineMode, inEditBoundaryMode, onTerritoryEditModeChange]);

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

  useEffect(() => {
    if (selectedPin?.type === "inducted" && selectedPin.id) {
      setPinDetailLoading(true);
      setMerchantDetailForPin(null);
      getMerchantDetail(selectedPin.id).then((d) => setMerchantDetailForPin(d ?? null)).finally(() => setPinDetailLoading(false));
    } else {
      setMerchantDetailForPin(null);
    }
  }, [selectedPin?.type, selectedPin?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    require("leaflet-defaulticon-compatibility");
  }, []);

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
      return [sum.lat / branchTerritory.length, sum.lng / branchTerritory.length] as [number, number];
    }
    return [ADDIS_ABABA_CENTER.lat, ADDIS_ABABA_CENTER.lng] as [number, number];
  }, [branchTerritory]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (inDefineMode) {
      setBoundaryPoints((prev) => [...prev, { lat, lng }]);
    } else if (inEditBoundaryMode) {
      setBoundaryPoints((prev) => [...prev, { lat, lng }]);
    }
  }, [inDefineMode, inEditBoundaryMode]);

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

  const handleZoneClick = (sel: SelectedZone) => {
    setSelectedTerritoryCell(null);
    setSelectedPin(null);
    setSelected(sel);
    setView("details");
  };

  const handleTerritoryCellClick = (
    cell: TerritoryCellWithCoords | TerritoryCellWithBranchName,
    clickedPosition?: { lat: number; lng: number }
  ) => {
    setSelected(null);
    setSelectedPin(null);
    setSelectedTerritoryCell(cell);
    if (clickedPosition) setTapPosition(clickedPosition);
  };

  const openScoutForm = () => {
    setView("scout-form");
  };

  const closeDrawer = () => {
    setSelected(null);
    setSelectedTerritoryCell(null);
    setSelectedPin(null);
    setMerchantDetailForPin(null);
    setView("details");
  };

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
  const openScoutFormFromCell = () => setView("scout-form");

  const refetchZones = async () => {
    try {
      const list = await getZones(branchId ?? undefined);
      setZones(list);
    } catch {
      // keep current
    }
  };

  const handleOverrideStatus = async (newStatus: ZoneStatus) => {
    if (!selected?.zone?.id) return;
    await updateZoneStatus(selected.zone.id, newStatus);
    await refetchZones();
  };

  const handleUpdateCell = useCallback(
    async (data: { status: MapZoneStatus; label: string | null }) => {
      if (!selectedTerritoryCell || !onUpdateCell) return;
      await onUpdateCell(selectedTerritoryCell.id, data);
    },
    [selectedTerritoryCell, onUpdateCell]
  );

  const statusLabel = selected?.zone
    ? selected.zone.status
    : "UNSEEN";
  const ownerName = selected?.zone?.ownerName ?? "—";
  const zoneId = selected?.zone?.id ?? null;
  const router = useRouter();
  const handleInduct = useCallback(() => {
    if (zoneId) router.push(`/induct/zone/${zoneId}`);
  }, [zoneId, router]);
  const selectedZoneMerchantCount = 0;
  const totalMerchantsForCapture = 10;
  const txVolume = "—";

  if (loading) {
    return (
      <div className="flex h-full w-full min-h-[400px] items-center justify-center bg-black/40" style={{ minHeight: "60vh" }}>
        <PortalLoadingInline className="min-h-[200px] w-full max-w-xs" />
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
      <div
        className="flex h-full w-full min-h-[400px] flex-col items-center justify-center gap-3 bg-muted/30 p-6 text-center"
        style={{ minHeight: "60vh" }}
      >
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
        className="relative h-full w-full min-h-[400px]"
        style={{ minHeight: "60vh" }}
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
        <MapContainer
          center={mapCenter}
          zoom={14}
          className="h-full w-full z-0"
          style={{ height: "100%", minHeight: "400px", background: "#1e293b" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSizeFix />
          {adminTerritories.length === 0 && branchTerritory && branchTerritory.length >= 2 && (
            <FitMapToTerritory points={branchTerritory} />
          )}
          <MapClickCapture onMapClick={handleMapClick} enabled={mapClickEnabled} />
          {adminTerritories.length > 0 && (
            <AdminTerritoryContent
              adminTerritories={adminTerritories}
              onCellClick={handleTerritoryCellClick}
            />
          )}
          {adminTerritories.length === 0 && branchTerritory && (
            <TerritoryContent
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
              onVertexDrag={inEditBoundaryMode ? handleVertexDrag : undefined}
            />
          )}
          {mapPins && (
            <>
              {spreadScouted.map(({ pin: lead, lat, lng }) => (
                <Marker
                  key={`scouted-${lead.id}`}
                  position={[lat, lng]}
                  eventHandlers={{
                    click: () => {
                      setSelected(null);
                      setSelectedTerritoryCell(null);
                      setSelectedPin({ type: "scouted", data: lead });
                    },
                  }}
                  icon={L.divIcon({
                    className: "pin-icon-scouted",
                    html: `<div style="width:16px;height:16px;border-radius:50%;background:#3b82f6;border:2px solid white;cursor:pointer"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                  title={lead.businessName}
                />
              ))}
              {spreadInducted.map(({ pin: m, lat, lng }) => (
                <Marker
                  key={`inducted-${m.id}`}
                  position={[lat, lng]}
                  eventHandlers={{
                    click: () => {
                      setSelected(null);
                      setSelectedTerritoryCell(null);
                      setSelectedPin({ type: "inducted", id: m.id });
                    },
                  }}
                  icon={L.divIcon({
                    className: "pin-icon-inducted",
                    html: `<div style="width:16px;height:16px;border-radius:50%;background:#22c55e;border:2px solid white;cursor:pointer"></div>`,
                    iconSize: [20, 20],
                    iconAnchor: [10, 10],
                  })}
                  title={m.businessName}
                />
              ))}
            </>
          )}
        </MapContainer>
        <MapOverlay
          zoneCount={zoneCount}
          merchantCount={merchantCount}
          visibleStatuses={visibleStatuses}
          onVisibleStatusesChange={setVisibleStatuses}
          mapContainerRef={mapContainerRef}
          showEditTerritory={isBranchManager && !!branchTerritory}
          isEditingTerritory={isEditingBoundary}
          onEditTerritory={() => setIsEditingBoundary(true)}
          onCancelEditTerritory={handleCancelBoundary}
        />
      </div>

      <Drawer
        open={!!selected || !!selectedTerritoryCell || !!selectedPin}
        onOpenChange={(open) => !open && closeDrawer()}
        direction="bottom"
      >
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
