import type { Region } from 'react-native-maps';
import type { Campus } from '../types/Campus';

/**
 * Camera presets (map regions) for each campus.
 *
 * These are used to:
 * - Default the map to a campus on first load (Sprint 2 baseline)
 * - Switch the camera later when the user toggles campuses (TASK-1.1.4 / US-1.3)
 *
 * NOTE on Region values:
 * - latitude/longitude: map center
 * - latitudeDelta/longitudeDelta: zoom level (smaller = more zoomed in)
 *
 * If the zoom feels off later, adjust the delta values rather than the center points.
 */

// SGW (Sir George Williams) — downtown campus (approx center point)
export const SGW_REGION: Region = {
  latitude: 45.4973,
  longitude: -73.5789,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

// Loyola — west campus (approx center point)
export const LOYOLA_REGION: Region = {
  latitude: 45.4582,
  longitude: -73.6405,
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};

/**
 * Returns the appropriate Region preset for a given campus.
 *
 * Keeping this logic in one place makes it easy to:
 * - update presets later without touching UI code
 * - reuse the same function across screens/components
 */
export function getCampusRegion(campus: Campus): Region {
  return campus === 'SGW' ? SGW_REGION : LOYOLA_REGION;
}