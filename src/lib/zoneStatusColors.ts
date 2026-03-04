/** Zone status colors for map polygons and legend. Matches Prisma ZoneStatus. */
export type MapZoneStatus =
  | "UNSEEN"
  | "SCOUTED"
  | "CAPTURED"
  | "FORTIFIED"
  | "AT_RISK"
  | "LOST";

export const ZONE_STATUS_COLORS: Record<MapZoneStatus, string> = {
  UNSEEN: "#1e3a5f",    // dark blue
  SCOUTED: "#38bdf8",   // light blue
  CAPTURED: "#22c55e",  // green
  FORTIFIED: "#f97316", // orange
  AT_RISK: "#ef4444",   // red
  LOST: "#7c2d12",      // dark red
};

export const ZONE_STATUS_LABELS: MapZoneStatus[] = [
  "UNSEEN",
  "SCOUTED",
  "CAPTURED",
  "FORTIFIED",
  "AT_RISK",
  "LOST",
];
