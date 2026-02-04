import { GEOJSON_ASSETS } from '../assets/geojson';
import type { GeoJsonFeatureCollection } from '../types/GeoJson';
import type { Campus } from '../types/Campus';
import type { BuildingShape } from '../types/BuildingShape';
import { getFeaturePolygons, normalizeCampusCode } from '../utils/geoJson';

/**
 * Building metadata properties from building_list.json.
 * Keep this loose (Record<string, unknown>) and pull only fields we need.
 */
type BuildingListProps = Record<string, unknown> & {
  unique_id?: string | number;
  Campus?: string;
  Building?: string; // short code e.g., "MB"
  BuildingName?: string;
  'Building Long Name'?: string;
  Address?: string;
};

/**
 * Building boundary properties from building_boundaries.json.
 */
type BuildingBoundaryProps = Record<string, unknown> & {
  unique_id?: string | number;
  id?: string | number;
};

const toStableId = (raw: unknown): string | null => {
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return null;
};

const getBestBuildingName = (props: BuildingListProps): string => {
  const longName = props['Building Long Name'];
  if (typeof longName === 'string' && longName.trim()) return longName.trim();

  if (typeof props.BuildingName === 'string' && props.BuildingName.trim()) {
    return props.BuildingName.trim();
  }

  if (typeof props.Building === 'string' && props.Building.trim()) {
    return props.Building.trim();
  }

  return 'Unknown Building';
};

/**
 * Parse and join datasets once, then reuse results (performance).
 */
let cachedAllBuildings: BuildingShape[] | null = null;

const buildAllBuildingsCache = (): BuildingShape[] => {
  const buildingList =
    GEOJSON_ASSETS.buildingList as unknown as GeoJsonFeatureCollection<BuildingListProps>;
  const boundaries =
    GEOJSON_ASSETS.buildingBoundaries as unknown as GeoJsonFeatureCollection<BuildingBoundaryProps>;

  // 1) Build metadata map: unique_id -> { campus, name, ... }
  const metaById = new Map<
    string,
    { campus: Campus; name: string; shortCode?: string; address?: string }
  >();

  for (const feature of buildingList.features) {
    const props = (feature.properties ?? {}) as BuildingListProps;

    const id = toStableId(props.unique_id);
    if (!id) continue;

    const campus = normalizeCampusCode(props.Campus);
    if (!campus) continue;

    metaById.set(id, {
      campus,
      name: getBestBuildingName(props),
      shortCode: typeof props.Building === 'string' ? props.Building : undefined,
      address: typeof props.Address === 'string' ? props.Address : undefined,
    });
  }

  // 2) Walk boundaries and join by unique_id
  const results: BuildingShape[] = [];

  for (const feature of boundaries.features) {
    const props = (feature.properties ?? {}) as BuildingBoundaryProps;

    const id = toStableId(props.unique_id);
    if (!id) continue;

    const meta = metaById.get(id);
    if (!meta) {
      // Graceful handling: boundary exists without metadata -> skip (no crash)
      continue;
    }

    const polygons = getFeaturePolygons(feature);
    if (!polygons.length) {
      // Graceful handling: invalid geometry -> skip (no crash)
      continue;
    }

    results.push({
      id,
      campus: meta.campus,
      name: meta.name,
      polygons,
      shortCode: meta.shortCode,
      address: meta.address,
    });
  }

  return results;
};

/**
 * Returns ALL joined building shapes (both campuses).
 * Useful for debugging or future features.
 */
export const getAllBuildingShapes = (): BuildingShape[] => {
  if (!cachedAllBuildings) cachedAllBuildings = buildAllBuildingsCache();
  return cachedAllBuildings;
};

/**
 * Returns campus-filtered building shapes for rendering.
 */
export const getCampusBuildingShapes = (campus: Campus): BuildingShape[] => {
  return getAllBuildingShapes().filter((b) => b.campus === campus);
};

/**
 * Optional helper: lookup by id for future selection/popup work.
 */
export const getBuildingShapeById = (id: string): BuildingShape | undefined => {
  return getAllBuildingShapes().find((b) => b.id === id);
};

/**
 * Find the first building that contains the given point/userCoords.
 * Return undefined if no building has that point.
 */
export const findBuildingAt = (point: { latitude: number; longitude: number }): BuildingShape | undefined => {
  const { isPointInAnyPolygon } = require('../utils/geoJson');

  for (const b of getAllBuildingShapes()) {
    if (isPointInAnyPolygon(point as any, b.polygons)) return b;
  }

  return undefined;
};
