/**
 * Subdivides a territory polygon into smaller rectangular cells.
 * Uses point-in-polygon (ray casting) to keep only cells whose center lies inside the territory.
 * Grid size scales with territory: larger territory => more rows/cols => smaller cells.
 */

export interface TerritoryCellPoint {
  lat: number;
  lng: number;
}

export interface TerritoryCellResult {
  code: string;
  coordinates: TerritoryCellPoint[];
  row: number;
  col: number;
}

const COORD_EPS = 1e-9;

/**
 * Normalizes territory polygon points: deduplicates consecutive points and closes the ring.
 * Returns a new array suitable for point-in-polygon and subdivision.
 */
export function normalizeTerritoryPoints(
  points: TerritoryCellPoint[]
): TerritoryCellPoint[] {
  if (!points || points.length < 3) return points;
  const out: TerritoryCellPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const prev = out[out.length - 1];
    if (
      prev &&
      Math.abs(p.lat - prev.lat) < COORD_EPS &&
      Math.abs(p.lng - prev.lng) < COORD_EPS
    ) {
      continue;
    }
    out.push({ lat: p.lat, lng: p.lng });
  }
  const first = out[0];
  const last = out[out.length - 1];
  if (
    first &&
    last &&
    out.length >= 3 &&
    (Math.abs(first.lat - last.lat) >= COORD_EPS ||
      Math.abs(first.lng - last.lng) >= COORD_EPS)
  ) {
    out.push({ lat: first.lat, lng: first.lng });
  }
  return out;
}

/** Target cell size in degrees (~0.003 deg ≈ 350 m at Addis Ababa). Smaller = more cells. */
const TARGET_CELL_DEG = 0.003;
const MIN_ROWS = 3;
const MIN_COLS = 3;
const MAX_ROWS = 48;
const MAX_COLS = 48;

/**
 * Computes grid rows and columns from territory bounds so that cell size stays roughly constant.
 * Bigger territory => more cells (smaller each).
 */
export function getGridSizeForBounds(
  bounds: TerritoryCellPoint[]
): { rows: number; cols: number } {
  const normalized = normalizeTerritoryPoints(bounds);
  if (normalized.length < 3) return { rows: MIN_ROWS, cols: MIN_COLS };
  const minLat = Math.min(...normalized.map((p) => p.lat));
  const maxLat = Math.max(...normalized.map((p) => p.lat));
  const minLng = Math.min(...normalized.map((p) => p.lng));
  const maxLng = Math.max(...normalized.map((p) => p.lng));
  const spanLat = maxLat - minLat;
  const spanLng = maxLng - minLng;
  const rows = Math.max(
    MIN_ROWS,
    Math.min(MAX_ROWS, Math.ceil(spanLat / TARGET_CELL_DEG))
  );
  const cols = Math.max(
    MIN_COLS,
    Math.min(MAX_COLS, Math.ceil(spanLng / TARGET_CELL_DEG))
  );
  return { rows, cols };
}

/**
 * Ray casting algorithm: returns true if point (lat, lng) is inside the polygon.
 * Polygon vertices are in order (e.g. clockwise or counter-clockwise).
 * Skips horizontal edges to avoid division by zero.
 */
export function pointInPolygon(
  lat: number,
  lng: number,
  polygon: TerritoryCellPoint[]
): boolean {
  const n = polygon.length;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lng;
    const yj = polygon[j].lat;
    const xj = polygon[j].lng;
    if (Math.abs(yj - yi) < COORD_EPS) continue; // skip horizontal edge
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Subdivides the territory polygon into a grid of rectangular cells.
 * Only cells whose center lies inside the polygon are included.
 *
 * @param bounds - Array of { lat, lng } polygon vertices (min 3 points)
 * @param rows - Number of rows in the grid
 * @param cols - Number of columns in the grid
 * @returns Array of cells with code, coordinates (4 corners), row, col
 */
export function subdivideTerritory(
  bounds: TerritoryCellPoint[],
  rows: number,
  cols: number
): TerritoryCellResult[] {
  const normalized = normalizeTerritoryPoints(bounds);
  if (normalized.length < 3) return [];

  const minLat = Math.min(...normalized.map((p) => p.lat));
  const maxLat = Math.max(...normalized.map((p) => p.lat));
  const minLng = Math.min(...normalized.map((p) => p.lng));
  const maxLng = Math.max(...normalized.map((p) => p.lng));

  const stepLat = (maxLat - minLat) / rows;
  const stepLng = (maxLng - minLng) / cols;

  const cells: TerritoryCellResult[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const centerLat = minLat + (row + 0.5) * stepLat;
      const centerLng = minLng + (col + 0.5) * stepLng;

      if (!pointInPolygon(centerLat, centerLng, normalized)) continue;

      const coordinates: TerritoryCellPoint[] = [
        { lat: minLat + row * stepLat, lng: minLng + col * stepLng },
        { lat: minLat + row * stepLat, lng: minLng + (col + 1) * stepLng },
        { lat: minLat + (row + 1) * stepLat, lng: minLng + (col + 1) * stepLng },
        { lat: minLat + (row + 1) * stepLat, lng: minLng + col * stepLng },
      ];

      cells.push({
        code: `TC_${row}_${col}`,
        coordinates,
        row,
        col,
      });
    }
  }

  return cells;
}
