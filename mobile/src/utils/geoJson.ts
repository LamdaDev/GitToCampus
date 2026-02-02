import type { LatLng } from "react-native-maps";
import type {
  GeoJsonFeature,
  GeoJsonMultiPolygon,
  GeoJsonPolygon,
  GeoJsonPosition,
} from "../types/GeoJson";
import type { Campus } from "../types/Campus";

/**
 * Convert a GeoJSON position [lng, lat] to react-native-maps LatLng.
 */
export const toLatLng = (pos: GeoJsonPosition): LatLng => {
  const [longitude, latitude] = pos;
  return { latitude, longitude };
};

/**
 * Basic validation: A polygon ring needs at least 3 points (4 if it repeats the first point).
 * We keep it lenient and only require >= 3 to avoid rejecting valid-but-unclosed rings.
 */
export const isValidRing = (ring: GeoJsonPosition[]): boolean => ring.length >= 3;

/**
 * Normalize campus codes found in GeoJSON properties into our app Campus type.
 * GeoJSON uses "LOY" but our app uses "LOYOLA".
 */
export const normalizeCampusCode = (raw: unknown): Campus | null => {
  if (typeof raw !== "string") return null;

  const trimmed = raw.trim().toUpperCase();
  if (trimmed === "SGW") return "SGW";
  if (trimmed === "LOY" || trimmed === "LOYOLA") return "LOYOLA";

  return null;
};

/**
 * Extract polygon rings from a GeoJSON Polygon or MultiPolygon geometry.
 * Output format: array of polygons, where each polygon is an array of LatLng points.
 *
 * - Polygon: returns one polygon (outer ring only by default).
 * - MultiPolygon: returns one polygon per contained polygon (outer ring only by default).
 *
 * Note: For US-1.2, we only need the outer ring to draw building footprints.
 * Holes (inner rings) are ignored for simplicity/sprint friendliness.
 */
export const extractOuterRingsAsLatLngPolygons = (
  geometry: GeoJsonPolygon | GeoJsonMultiPolygon
): LatLng[][] => {
  if (geometry.type === "Polygon") {
    const outerRing = geometry.coordinates?.[0];
    if (!outerRing || !isValidRing(outerRing)) return [];
    return [outerRing.map(toLatLng)];
  }

  // MultiPolygon
  const multi = geometry as GeoJsonMultiPolygon;
  const polygons: LatLng[][] = [];

  for (const poly of multi.coordinates ?? []) {
    const outerRing = poly?.[0];
    if (!outerRing || !isValidRing(outerRing)) continue;
    polygons.push(outerRing.map(toLatLng));
  }

  return polygons;
};

/**
 * Safe helper: attempts to extract render-ready polygons from a feature.
 * Returns [] if geometry is missing/unsupported/invalid.
 */
export const getFeaturePolygons = (feature: GeoJsonFeature): LatLng[][] => {
  if (!feature.geometry) return [];

  if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
    return extractOuterRingsAsLatLngPolygons(feature.geometry);
  }

  return [];
};
