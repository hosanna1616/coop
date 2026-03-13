"use client";

import { useState, useEffect } from "react";
import {
  getLeadsAndMerchantsByZoneCode,
  getLeadsAndMerchantsByCell,
} from "@/app/actions/leads-list";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalLoadingInline } from "@/components/ui/portal-loading";

type LeadRow = {
  id: string;
  businessName: string;
  category: string;
  estimatedVolume: string;
  scoutedBy: { id: string; name: string };
  createdAt: Date;
};

type MerchantRow = {
  id: string;
  ownerName: string;
  phoneNumber: string;
  lead: { businessName: string; category: string } | null;
  inductedBy: { id: string; name: string };
  onboardingDate: Date;
};

type Filter = "all" | "scouted" | "registered";

export function CellMerchantsPanel({
  zoneCode,
  branchId,
  cellCoordinates,
}: {
  zoneCode: string;
  /** When viewing a territory cell, pass its branchId so we can load by geography. */
  branchId?: string | null;
  /** When set, load leads/merchants whose location is inside this polygon (correct after territory reshape). */
  cellCoordinates?: { lat: number; lng: number }[] | null;
}) {
  const [data, setData] = useState<{ leads: LeadRow[]; merchants: MerchantRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    setLoading(true);
    const coords = cellCoordinates && cellCoordinates.length >= 3 ? cellCoordinates : null;
    if (branchId && coords) {
      getLeadsAndMerchantsByCell(branchId, coords)
        .then(setData)
        .catch(() => setData({ leads: [], merchants: [] }))
        .finally(() => setLoading(false));
    } else {
      getLeadsAndMerchantsByZoneCode(zoneCode)
        .then(setData)
        .catch(() => setData({ leads: [], merchants: [] }))
        .finally(() => setLoading(false));
    }
  }, [zoneCode, branchId, cellCoordinates]);

  if (loading) {
    return (
      <section className="border-t border-border pt-4">
        <PortalLoadingInline className="min-h-[80px] py-4" />
      </section>
    );
  }

  const leads = data?.leads ?? [];
  const merchants = data?.merchants ?? [];
  const showScouted = filter === "all" || filter === "scouted";
  const showRegistered = filter === "all" || filter === "registered";

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-medium text-muted-foreground">
          Merchants in this block
        </span>
        <div className="flex rounded-md border border-border p-0.5" role="tablist">
          <FilterTab
            active={filter === "all"}
            onClick={() => setFilter("all")}
            label="All"
          />
          <FilterTab
            active={filter === "scouted"}
            onClick={() => setFilter("scouted")}
            label="Scouted"
          />
          <FilterTab
            active={filter === "registered"}
            onClick={() => setFilter("registered")}
            label="Registered"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 font-mono text-xs">
        {showScouted && leads.length > 0 && (
          <div>
            <p className="mb-1 text-muted-foreground">Scouted ({leads.length})</p>
            <ul className="flex flex-col gap-1 rounded border border-border bg-muted/30 p-2">
              {leads.map((l) => (
                <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-medium text-foreground">{l.businessName}</span>
                  <span className="text-muted-foreground">{l.category}</span>
                  <span className="text-muted-foreground">{l.scoutedBy.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {showRegistered && merchants.length > 0 && (
          <div>
            <p className="mb-1 text-muted-foreground">Registered ({merchants.length})</p>
            <ul className="flex flex-col gap-1 rounded border border-border bg-muted/30 p-2">
              {merchants.map((m) => (
                <li key={m.id} className="flex flex-wrap items-baseline justify-between gap-1">
                  <span className="font-medium text-foreground">
                    {m.ownerName}
                    {m.lead ? ` · ${m.lead.businessName}` : ""}
                  </span>
                  <span className="text-muted-foreground">{m.lead?.category ?? "—"}</span>
                  <span className="text-muted-foreground">{m.inductedBy.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {((filter === "all" && leads.length === 0 && merchants.length === 0) ||
          (filter === "scouted" && leads.length === 0) ||
          (filter === "registered" && merchants.length === 0)) && (
          <p className="text-muted-foreground">
            {filter === "all"
              ? "No scouted leads or registered merchants in this block yet."
              : filter === "scouted"
                ? "No scouted leads in this block."
                : "No registered merchants in this block."}
          </p>
        )}
      </div>
    </section>
  );
}

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-7 rounded px-2 text-xs font-mono",
        active ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"
      )}
      onClick={onClick}
      role="tab"
      aria-selected={active}
    >
      {label}
    </Button>
  );
}
