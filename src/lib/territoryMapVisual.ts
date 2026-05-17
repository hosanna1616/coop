import { ZONE_STATUS_COLORS, type MapZoneStatus } from "@/lib/zoneStatusColors";
import { pointInPolygon } from "@/lib/territoryGrid";

/** Outer branch territory ring (reference: thin blue outline, light fill). */
export const TERRITORY_BOUNDARY = {
  strokeColor: "#3b82f6",
  strokeWeight: 3,
  fillColor: "#3b82f6",
  fillOpacity: 0.06,
} as const;

export function getTerritoryCellStyle(
  status: MapZoneStatus,
  visible: boolean,
): {
  color: string;
  weight: number;
  fillColor: string;
  fillOpacity: number;
} | null {
  if (!visible) return null;
  const fill = ZONE_STATUS_COLORS[status] ?? ZONE_STATUS_COLORS.UNSEEN;
  return {
    color: "#0f172a",
    weight: 1,
    fillColor: fill,
    fillOpacity: status === "UNSEEN" ? 0.85 : 0.7,
  };
}

export function filterPinsInsideTerritory<
  T extends { locationLat: number; locationLng: number },
>(pins: T[], boundary: { lat: number; lng: number }[] | null | undefined): T[] {
  if (!boundary || boundary.length < 3) return pins;
  return pins.filter((p) =>
    pointInPolygon(p.locationLat, p.locationLng, boundary),
  );
}

/** Red circle + white cross (reference map merchant markers). */
export const SCOUTED_PIN_HTML =
  '<div style="width:22px;height:22px;border-radius:50%;background:#ef4444;border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer"><span style="color:#fff;font-size:14px;font-weight:700;line-height:1">+</span></div>';

/** Fortified / inducted marker (reference: brown tower). */
export const INDUCTED_PIN_HTML =
  '<div style="width:20px;height:20px;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))"><svg viewBox="0 0 24 24" width="20" height="20" fill="#92400e" stroke="#451a03" stroke-width="1"><path d="M4 20h16v2H4zm2-2h12l1-8H5zm3-8h6l1-6h-8zM9 4h6v2H9z"/></svg></div>';
