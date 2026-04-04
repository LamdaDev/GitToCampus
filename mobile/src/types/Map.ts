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

export type BuildingLabelRenderItem = {
  key: string;
  buildingId: string;
  campus: Campus;
  label: string;
  center: LatLng;
  zoomThreshold: number;
};

export type OutdoorRouteSegment = {
  encodedPolyline: string;
  requiresWalking: boolean;
};

export type OutdoorRouteOverlay = {
  encodedPolyline: string;
  start: LatLng;
  destination: LatLng;
  isWalkingRoute?: boolean;
  routeSegments?: OutdoorRouteSegment[];
  distanceText?: string;
  durationText?: string;
  distanceMeters?: number;
  durationSeconds?: number;
};
