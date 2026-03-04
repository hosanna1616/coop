/**
 * Generates a grid of square zone polygons (500m x 500m by default) around a center point.
 * Returns cells with a stable code (row_col) for mapping to DB Zone.code.
 * Approximate: at Addis Ababa latitude ~9°, 1° lat ≈ 111 km, so 500m ≈ 0.0045°.
 */

export interface GridCell {
  code: string;
  polygon: Array<{ lat: number; lng: number }>;
  centerLat: number;
  centerLng: number;
}

const METERS_TO_DEG_LAT = 1 / 111320; // ~0.00000898 per meter at equator; conservative
const METERS_TO_DEG_LNG_AT_9 = 1 / (111320 * Math.cos((9 * Math.PI) / 180)); // ~0.00000905 at lat 9

export function generateZoneGrid(
  centerLat: number,
  centerLng: number,
  sideMeters: number = 500,
  gridSize: number = 10 // 10x10 = 100 cells each side; total 21x21 = 441 if we do ±10
): GridCell[] {
  const halfSideDegLat = (sideMeters * METERS_TO_DEG_LAT) / 2;
  const halfSideDegLng = (sideMeters * METERS_TO_DEG_LNG_AT_9) / 2;
  const stepLat = sideMeters * METERS_TO_DEG_LAT;
  const stepLng = sideMeters * METERS_TO_DEG_LNG_AT_9;

  const cells: GridCell[] = [];
  const offset = Math.floor(gridSize / 2); // e.g. 10 -> -5..5

  for (let row = -offset; row <= offset; row++) {
    for (let col = -offset; col <= offset; col++) {
      const centerCellLat = centerLat + row * stepLat;
      const centerCellLng = centerLng + col * stepLng;
      const polygon = [
        {
          lat: centerCellLat - halfSideDegLat,
          lng: centerCellLng - halfSideDegLng,
        },
        {
          lat: centerCellLat - halfSideDegLat,
          lng: centerCellLng + halfSideDegLng,
        },
        {
          lat: centerCellLat + halfSideDegLat,
          lng: centerCellLng + halfSideDegLng,
        },
        {
          lat: centerCellLat + halfSideDegLat,
          lng: centerCellLng - halfSideDegLng,
        },
      ];
      const code = `Z${row + offset}_${col + offset}`;
      cells.push({
        code,
        polygon,
        centerLat: centerCellLat,
        centerLng: centerCellLng,
      });
    }
  }
  return cells;
}

export const ADDIS_ABABA_CENTER = { lat: 9.03, lng: 38.74 };
