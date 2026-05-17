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

const SEGMENT_ORIENT_EPS = 1e-10;

function cross2(o: TerritoryCellPoint, a: TerritoryCellPoint, b: TerritoryCellPoint): number {
  return (a.lng - o.lng) * (b.lat - o.lat) - (a.lat - o.lat) * (b.lng - o.lng);
}

function onSegment(p: TerritoryCellPoint, q: TerritoryCellPoint, r: TerritoryCellPoint): boolean {
  return (
    q.lng <= Math.max(p.lng, r.lng) + SEGMENT_ORIENT_EPS &&
    q.lng + SEGMENT_ORIENT_EPS >= Math.min(p.lng, r.lng) &&
    q.lat <= Math.max(p.lat, r.lat) + SEGMENT_ORIENT_EPS &&
    q.lat + SEGMENT_ORIENT_EPS >= Math.min(p.lat, r.lat)
  );
}

/** True if closed-segment AB intersects CD (excluding shared-endpoint touches as non-intersections). */
function segmentsIntersect(
  a: TerritoryCellPoint,
  b: TerritoryCellPoint,
  c: TerritoryCellPoint,
  d: TerritoryCellPoint,
): boolean {
  const o1 = cross2(a, b, c);
  const o2 = cross2(a, b, d);
  const o3 = cross2(c, d, a);
  const o4 = cross2(c, d, b);

  if (o1 > SEGMENT_ORIENT_EPS && o2 < -SEGMENT_ORIENT_EPS && o3 > SEGMENT_ORIENT_EPS && o4 < -SEGMENT_ORIENT_EPS)
    return true;
  if (o1 < -SEGMENT_ORIENT_EPS && o2 > SEGMENT_ORIENT_EPS && o3 < -SEGMENT_ORIENT_EPS && o4 > SEGMENT_ORIENT_EPS)
    return true;

  if (Math.abs(o1) < SEGMENT_ORIENT_EPS && onSegment(a, c, b)) return true;
  if (Math.abs(o2) < SEGMENT_ORIENT_EPS && onSegment(a, d, b)) return true;
  if (Math.abs(o3) < SEGMENT_ORIENT_EPS && onSegment(c, a, d)) return true;
  if (Math.abs(o4) < SEGMENT_ORIENT_EPS && onSegment(c, b, d)) return true;

  return false;
}

/**
 * True if the polygon boundary crosses itself (e.g. figure-eight). Branch territory must be one simple region.
 */
export function polygonSelfIntersects(polygon: TerritoryCellPoint[]): boolean {
  if (!polygon || polygon.length < 4) return false;
  let ring = [...polygon];
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (
    first &&
    last &&
    Math.abs(first.lat - last.lat) < COORD_EPS &&
    Math.abs(first.lng - last.lng) < COORD_EPS
  ) {
    ring = ring.slice(0, -1);
  }
  const m = ring.length;
  if (m < 3) return false;

  for (let i = 0; i < m; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % m];
    for (let j = i + 2; j < m; j++) {
      if (i === 0 && j === m - 1) continue;
      const p3 = ring[j];
      const p4 = ring[(j + 1) % m];
      if (segmentsIntersect(p1, p2, p3, p4)) return true;
    }
  }
  return false;
}

/** Number of 4-connected components among grid cells (must be 1 for a single contiguous territory). */
export function territoryCellGridComponentCount(cells: { row: number; col: number }[]): number {
  if (cells.length === 0) return 0;
  const key = (r: number, c: number) => `${r},${c}`;
  const inSet = new Set(cells.map((c) => key(c.row, c.col)));
  const visited = new Set<string>();
  let components = 0;
  for (const cell of cells) {
    const start = key(cell.row, cell.col);
    if (visited.has(start)) continue;
    components += 1;
    const stack: { row: number; col: number }[] = [{ row: cell.row, col: cell.col }];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const k = key(cur.row, cur.col);
      if (!inSet.has(k) || visited.has(k)) continue;
      visited.add(k);
      stack.push(
        { row: cur.row - 1, col: cur.col },
        { row: cur.row + 1, col: cur.col },
        { row: cur.row, col: cur.col - 1 },
        { row: cur.row, col: cur.col + 1 },
      );
    }
  }
  return components;
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
