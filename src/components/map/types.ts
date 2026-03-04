import type { GridCell } from "@/lib/zoneGrid";
import type { ZoneWithStats } from "@/app/actions/zones";

export type SelectedZone = {
  cell: GridCell;
  zone: ZoneWithStats | null;
};
