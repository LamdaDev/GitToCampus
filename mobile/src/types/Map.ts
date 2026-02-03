import type { LatLng } from 'react-native-maps';
import type { Campus } from './Campus';

/**
 * UI-layer render item for map polygons.
 * Used to flatten BuildingShape MultiPolygons into individual Polygon render entries.
 */
export type PolygonRenderItem = {
  key: string;
  buildingId: string;
  campus: Campus;
  coordinates: LatLng[];
};
