"use client";

import {
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import type { MapZoneStatus } from "@/lib/zoneStatusColors";
import type { TerritoryCellWithCoords, TerritoryCellWithBranchName } from "@/app/actions/branch-territory";
import { CellMerchantsPanel } from "./CellMerchantsPanel";

const STATUS_BADGE_CLASS: Record<MapZoneStatus, string> = {
  UNSEEN: "bg-muted",
  SCOUTED: "bg-primary",
  CAPTURED: "bg-green-600",
  FORTIFIED: "bg-orange-500",
  AT_RISK: "bg-secondary",
  LOST: "bg-red-900",
};

export function PlayerCellDrawer({
  cell,
  zoneId,
  cellStatus,
  onClose,
  onScout,
  onInduct,
}: {
  cell: TerritoryCellWithCoords | TerritoryCellWithBranchName;
  zoneId: string | null;
  cellStatus: MapZoneStatus;
  onClose: () => void;
  onScout: () => void;
  onInduct?: () => void;
}) {
  return (
    <>
      <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
        <div className="min-w-0 flex-1">
          <DrawerTitle className="font-mono text-xl text-primary">{cell.code}</DrawerTitle>
          <span
            className={cn(
              "mt-2 inline-flex rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
              STATUS_BADGE_CLASS[cellStatus ?? "UNSEEN"]
            )}
          >
            {(cellStatus ?? "UNSEEN").replace("_", " ")}
          </span>
        </div>
        <DrawerClose asChild>
          <Button variant="ghost" size="icon" className="shrink-0" aria-label="Close">
            <X className="size-5" />
          </Button>
        </DrawerClose>
      </DrawerHeader>
      <div className="flex flex-col gap-3 px-4 pb-6">
        <Button className="h-12 font-mono" onClick={onScout}>
          Scout This Zone
        </Button>
        {onInduct ? (
          <Button className="h-12 font-mono" variant="secondary" onClick={onInduct}>
            Induct Merchant
          </Button>
        ) : (
          <p className="text-muted-foreground text-xs">
            Scout this zone first to add leads; then you can induct merchants.
          </p>
        )}
        <CellMerchantsPanel zoneCode={cell.code} />
      </div>
    </>
  );
}
