"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CellMerchantsPanel } from "@/components/map/CellMerchantsPanel";

export type ZoneStatus = "UNSEEN" | "SCOUTED" | "CAPTURED" | "FORTIFIED" | "AT_RISK" | "LOST";

const STATUS_BADGE_CLASS: Record<ZoneStatus, string> = {
  UNSEEN: "bg-muted",
  SCOUTED: "bg-primary",
  CAPTURED: "bg-green-600",
  FORTIFIED: "bg-orange-500",
  AT_RISK: "bg-secondary",
  LOST: "bg-red-900",
};

const ALL_STATUSES: ZoneStatus[] = ["UNSEEN", "SCOUTED", "CAPTURED", "FORTIFIED", "AT_RISK", "LOST"];

export interface ZoneDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  zoneCode: string;
  zoneId: string | null;
  status: ZoneStatus;
  owner: string | null;
  merchantCount: number;
  totalMerchantsForCapture: number;
  txVolume: string;
  userRole: Role | null;
  onScout?: () => void;
  onInduct?: () => void;
  onOverrideStatus?: (newStatus: ZoneStatus) => void | Promise<void>;
  /** When true, only render inner content (no Drawer wrapper) for embedding in parent Drawer */
  embedded?: boolean;
}

function ZoneDrawerContentInner({
  onClose,
  zoneCode,
  status,
  owner,
  merchantCount,
  totalMerchantsForCapture,
  txVolume,
  userRole,
  zoneId,
  onScout,
  onInduct,
  onOverrideStatus,
}: ZoneDrawerProps) {
  const [overrideStatus, setOverrideStatus] = useState<ZoneStatus | "">("");
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);
  const progressPercent =
    totalMerchantsForCapture > 0
      ? Math.min(100, (merchantCount / totalMerchantsForCapture) * 100)
      : 0;

  const showScout = status === "UNSEEN" && userRole === "PLAYER" && onScout;
  const showInduct = (status === "SCOUTED" || status === "CAPTURED") && userRole === "PLAYER" && onInduct;
  const showOverride =
    (userRole === "BRANCH_MANAGER" || userRole === "ADMIN") &&
    zoneId &&
    onOverrideStatus;

  const handleOverrideSubmit = async () => {
    if (!overrideStatus || overrideStatus === status || !onOverrideStatus) return;
    setOverrideSubmitting(true);
    try {
      await onOverrideStatus(overrideStatus as ZoneStatus);
      setOverrideStatus("");
    } finally {
      setOverrideSubmitting(false);
    }
  };

  const content = (
    <>
      <DrawerHeader className="flex flex-row items-start justify-between gap-4 p-4 text-left">
        <div className="flex min-w-0 flex-col gap-2">
          <DrawerTitle className="font-mono text-xl text-primary">
            {zoneCode}
          </DrawerTitle>
          <span
            className={cn(
              "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium text-primary-foreground",
              STATUS_BADGE_CLASS[status]
            )}
          >
            {status.replace("_", " ")}
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
          <p className="text-foreground">
            <span className="text-muted-foreground">OWNER:</span> {owner ?? "—"}
          </p>
          <div>
            <p className="text-foreground">
              <span className="text-muted-foreground">ACTIVE MERCHANTS:</span>{" "}
              {merchantCount} / {totalMerchantsForCapture}
            </p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <p className="text-foreground">
            <span className="text-muted-foreground">MONTHLY TX VOLUME:</span> {txVolume}
          </p>
        </section>

        <div className="flex flex-col gap-3">
          {showScout && (
            <Button
              className="h-12 font-mono"
              onClick={onScout}
            >
              Scout This Zone
            </Button>
          )}
          {showInduct && (
            <Button
              className="h-12 font-mono"
              onClick={onInduct}
            >
              Induct Merchant
            </Button>
          )}
          {showOverride && (
            <div className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">Override status (manager/admin)</p>
              <div className="flex gap-2">
                <Select
                  value={overrideStatus}
                  onValueChange={(v) => setOverrideStatus(v as ZoneStatus)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!overrideStatus || overrideStatus === status || overrideSubmitting}
                  onClick={handleOverrideSubmit}
                >
                  {overrideSubmitting ? "…" : "Override"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <CellMerchantsPanel zoneCode={zoneCode} />
      </div>
    </>
  );

  return content;
}

export function ZoneDrawer(props: ZoneDrawerProps) {
  const { isOpen, onClose, embedded } = props;
  const inner = <ZoneDrawerContentInner {...props} />;

  if (embedded) {
    return <>{inner}</>;
  }

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="bottom">
      <DrawerContent className="border-t border-border bg-card text-card-foreground">
        <DrawerTitle className="sr-only">Zone details</DrawerTitle>
        {inner}
      </DrawerContent>
    </Drawer>
  );
}
