import { GEOJSON_ASSETS } from '../assets/geojson';
import type { GeoJsonFeatureCollection } from '../types/GeoJson';
import { getFeaturePolygons } from './geoJson';

/**
 * Debug-only helper to verify we can read GeoJSON and extract polygons without crashing.
 * Remove or stop calling once verified.
 */
export const logGeoJsonSummary = (): void => {
  const boundaries = GEOJSON_ASSETS.buildingBoundaries as unknown as GeoJsonFeatureCollection;
  const buildings = GEOJSON_ASSETS.buildingList as unknown as GeoJsonFeatureCollection;
  const campuses = GEOJSON_ASSETS.campusOutlines as unknown as GeoJsonFeatureCollection;

  const boundaryPolygonsCount = boundaries.features.reduce(
    (acc, f) => acc + getFeaturePolygons(f).length,
    0,
  );

  console.log('GeoJSON summary:');
  console.log('- building_boundaries features:', boundaries.features.length);
  console.log('- extracted boundary polygons:', boundaryPolygonsCount);
  console.log('- building_list features:', buildings.features.length);
  console.log('- campus features:', campuses.features.length);
};
