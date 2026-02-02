// Clean export entry point for local GeoJSON assets (stored as .json for bundler compatibility)

import buildingBoundaries from './building_boundaries.json';
import buildingList from './building_list.json';
import campusOutlines from './campus.json';

export const GEOJSON_ASSETS = {
  buildingBoundaries,
  buildingList,
  campusOutlines,
} as const;
