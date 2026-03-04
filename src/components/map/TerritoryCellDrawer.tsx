"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TerritoryCellWithCoords } from "@/app/actions/branch-territory";
import type { MapZoneStatus } from "@/lib/zoneStatusColors";
import { CellMerchantsPanel } from "./CellMerchantsPanel";

const STATUS_BADGE_CLASS: Record<MapZoneStatus, string> = {
  UNSEEN: "bg-muted",
  SCOUTED: "bg-primary",
  CAPTURED: "bg-green-600",
  FORTIFIED: "bg-orange-500",
  AT_RISK: "bg-secondary",
  LOST: "bg-red-900",
};

const ALL_STATUSES: MapZoneStatus[] = ["UNSEEN", "SCOUTED", "CAPTURED", "FORTIFIED", "AT_RISK", "LOST"];

export interface TerritoryCellDrawerProps {
  cell: TerritoryCellWithCoords;
  onClose: () => void;
  onSave?: (data: { status: MapZoneStatus; label: string | null }) => void | Promise<void>;
  branchName?: string;
  readOnly?: boolean;
}

export function TerritoryCellDrawer({ cell, onClose, onSave, branchName, readOnly = false }: TerritoryCellDrawerProps) {
  const [status, setStatus] = useState<MapZoneStatus>(cell.status as MapZoneStatus);
  const [label, setLabel] = useState(cell.label ?? "");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setSubmitting(true);
    try {
      await onSave({
        status,
        label: label.trim() || null,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (readOnly) {
    return (
      <>
        <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
          <div className="flex min-w-0 flex-col gap-2">
            <DrawerTitle className="font-mono text-xl text-primary">
              {cell.code}
            </DrawerTitle>
            <span
              className={cn(
                "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
                STATUS_BADGE_CLASS[(cell.status as MapZoneStatus) ?? "UNSEEN"]
              )}
            >
              {(cell.status as string).replace("_", " ")}
            </span>
          </div>
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4 pb-6 font-mono text-sm">
          {branchName != null && (
            <p className="text-foreground">
              <span className="text-muted-foreground">Branch:</span> {branchName}
            </p>
          )}
          <p className="text-foreground">
            <span className="text-muted-foreground">Status:</span> {(cell.status as string).replace("_", " ")}
          </p>
          <p className="text-foreground">
            <span className="text-muted-foreground">Label:</span> {cell.label ?? "—"}
          </p>
          <CellMerchantsPanel zoneCode={cell.code} />
        </div>
      </>
    );
  }
  return (
    <>
      <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
        <div className="flex min-w-0 flex-col gap-2">
          <DrawerTitle className="font-mono text-xl text-primary">
            {cell.code}
          </DrawerTitle>
          <span
            className={cn(
              "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
              STATUS_BADGE_CLASS[status as MapZoneStatus]
            )}
          >
            {(status as string).replace("_", " ")}
          </span>
        </div>
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </Button>
        </DrawerClose>
      </DrawerHeader>

      <div className="flex flex-col gap-6 px-4 pb-6">
        <section className="flex flex-col gap-3 font-mono text-sm">
          <div>
            <label className="text-muted-foreground text-xs">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as MapZoneStatus)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-muted-foreground text-xs">Label (optional)</label>
            <Input
              className="mt-1 font-mono"
              placeholder="e.g. North sector"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </section>

        <Button
          className="h-12 font-mono"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? "Saving…" : "Save"}
        </Button>
        <CellMerchantsPanel zoneCode={cell.code} />
      </div>
    </>
  );
}
