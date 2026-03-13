"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { getMyTaskForCell } from "@/app/actions/mission";

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
  branchId: branchIdProp,
  onClose,
  onScout,
  onInduct,
}: {
  cell: TerritoryCellWithCoords | TerritoryCellWithBranchName;
  zoneId: string | null;
  cellStatus: MapZoneStatus;
  /** Branch that owns this cell (from map context when cell has no branchId). */
  branchId?: string | null;
  onClose: () => void;
  onScout: () => void;
  onInduct?: () => void;
}) {
  const [taskForCell, setTaskForCell] = useState<{ id: string; title: string; mission: { id: string; name: string } } | null>(null);

  useEffect(() => {
    getMyTaskForCell(cell.id).then((t) => {
      if (t) setTaskForCell({ id: t.id, title: t.title, mission: t.mission });
      else setTaskForCell(null);
    }).catch(() => setTaskForCell(null));
  }, [cell.id]);

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
        {taskForCell && (
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="font-mono text-xs font-medium text-muted-foreground">Your task for this cell</p>
            <p className="font-mono text-sm font-semibold text-foreground">{taskForCell.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{taskForCell.mission.name}</p>
            <Button asChild size="sm" variant="outline" className="mt-2 font-mono">
              <Link href={`/missions/task/${taskForCell.id}`}>View task</Link>
            </Button>
          </div>
        )}
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
        <CellMerchantsPanel
          zoneCode={cell.code}
          branchId={("branchId" in cell ? cell.branchId : branchIdProp) ?? undefined}
          cellCoordinates={cell.coordinates}
        />
      </div>
    </>
  );
}
