import type { LatLng } from "react-native-maps";
import type { Campus } from "./Campus";

/**
 * Render-ready building shape model used by the map UI.
 * A building can have multiple polygons (MultiPolygon).
 */
export type BuildingShape = {
  id: string; // unique_id from datasets
  campus: Campus;
  name: string;

  // One building can contain multiple polygons (MultiPolygon).
  polygons: LatLng[][];

  // Optional metadata (future US-1.5)
  shortCode?: string; // e.g., "MB"
  address?: string;
};
