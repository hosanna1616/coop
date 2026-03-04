"use client";

import { useCallback, useState } from "react";
import { Filter, Layers, Maximize2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ZONE_STATUS_COLORS,
  ZONE_STATUS_LABELS,
  type MapZoneStatus,
} from "@/lib/zoneStatusColors";

export interface MapOverlayProps {
  zoneCount: number;
  merchantCount: number;
  /** Which statuses are visible on the map. Default all true. */
  visibleStatuses: Set<MapZoneStatus>;
  onVisibleStatusesChange: (next: Set<MapZoneStatus>) => void;
  /** Ref to the map container element for fullscreen */
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
  /** Optional: map type for layers (e.g. roadmap / satellite) */
  mapType?: "roadmap" | "satellite";
  onMapTypeChange?: (type: "roadmap" | "satellite") => void;
  /** Territory edit: show Edit Territory button (branch manager with territory) */
  showEditTerritory?: boolean;
  /** Territory edit: currently in boundary edit mode */
  isEditingTerritory?: boolean;
  /** Territory edit: start editing boundary */
  onEditTerritory?: () => void;
  /** Territory edit: cancel editing boundary */
  onCancelEditTerritory?: () => void;
}

export function MapOverlay({
  zoneCount,
  merchantCount,
  visibleStatuses,
  onVisibleStatusesChange,
  mapContainerRef,
  mapType = "roadmap",
  onMapTypeChange,
  showEditTerritory = false,
  isEditingTerritory = false,
  onEditTerritory,
  onCancelEditTerritory,
}: MapOverlayProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);

  const toggleStatus = useCallback(
    (status: MapZoneStatus) => {
      const next = new Set(visibleStatuses);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      onVisibleStatusesChange(next);
    },
    [visibleStatuses, onVisibleStatusesChange]
  );

  const toggleFullscreen = useCallback(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, [mapContainerRef]);

  return (
    <>
      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-start justify-between gap-4 bg-gradient-to-b from-background/95 to-transparent px-4 pt-4">
        <div>
          <h2 className="font-mono text-lg font-bold text-foreground">
            Territory Command
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            ADDIS ABABA • {zoneCount} ZONES • {merchantCount.toLocaleString()} MERCHANTS
          </p>
        </div>
        <div className="flex items-center gap-1">
          {showEditTerritory && (
            isEditingTerritory ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-500/50 bg-amber-500/10 font-mono text-xs text-amber-700 dark:text-amber-400"
                onClick={onCancelEditTerritory}
              >
                <Pencil className="size-3.5" />
                Cancel Edit
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 font-mono text-xs"
                onClick={onEditTerritory}
              >
                <Pencil className="size-3.5" />
                Edit Territory
              </Button>
            )
          )}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-border bg-card/95 font-mono text-xs"
              onClick={() => setFilterOpen((o) => !o)}
            >
              <Filter className="size-3.5" />
              FILTER
            </Button>
            {filterOpen && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  aria-hidden
                  onClick={() => setFilterOpen(false)}
                />
                <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-md border border-border bg-card p-2 shadow-lg">
                  <p className="mb-2 font-mono text-xs font-semibold text-foreground">
                    Show zones
                  </p>
                  {ZONE_STATUS_LABELS.map((status) => (
                    <label
                      key={status}
                      className="flex cursor-pointer items-center gap-2 py-1 font-mono text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={visibleStatuses.has(status)}
                        onChange={() => toggleStatus(status)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <span
                        className="inline-block size-3 shrink-0 rounded-sm"
                        style={{ backgroundColor: ZONE_STATUS_COLORS[status] }}
                      />
                      {status.replace("_", " ")}
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
          {onMapTypeChange && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-border bg-card/95 font-mono text-xs"
                onClick={() => setLayersOpen((o) => !o)}
              >
                <Layers className="size-3.5" />
                LAYERS
              </Button>
              {layersOpen && (
                <>
                  <div
                    className="fixed inset-0 z-0"
                    aria-hidden
                    onClick={() => setLayersOpen(false)}
                  />
                  <div className="absolute right-0 top-full z-10 mt-1 w-36 rounded-md border border-border bg-card p-2 shadow-lg">
                    {(["roadmap", "satellite"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          onMapTypeChange(type);
                          setLayersOpen(false);
                        }}
                        className={`block w-full rounded px-2 py-1.5 text-left font-mono text-xs capitalize ${
                          mapType === type
                            ? "bg-primary/20 text-primary"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            className="border-border bg-card/95"
            onClick={toggleFullscreen}
            aria-label="Fullscreen"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Bottom legend */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-gradient-to-t from-background/95 to-transparent px-4 pb-3 pt-6">
        {ZONE_STATUS_LABELS.map((status) => (
          <div
            key={status}
            className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
          >
            <span
              className="size-3.5 shrink-0 rounded-sm border border-border"
              style={{ backgroundColor: ZONE_STATUS_COLORS[status] }}
            />
            <span>{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </>
  );
}
