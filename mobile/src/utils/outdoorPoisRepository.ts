import { getDistance } from 'geolib';
import { getCampusRegion } from '../constants/campuses';
import { OUTDOOR_POIS } from '../constants/outdoorPois';
import { POI_RESULT_LIMIT, POI_SEARCH_RADIUS_METERS } from '../constants/poi';
import type { Campus } from '../types/Campus';
import type { OutdoorPoi, PoiCategory } from '../types/Poi';

export type NearbyOutdoorPoiResult = {
  poi: OutdoorPoi;
  distance: number;
};

export const getAllOutdoorPois = (): OutdoorPoi[] => OUTDOOR_POIS;

export const getCampusOutdoorPois = (campus: Campus): OutdoorPoi[] =>
  OUTDOOR_POIS.filter((poi) => poi.campus === campus);

export const getCampusOutdoorPoisByCategory = (
  campus: Campus,
  category: PoiCategory,
): OutdoorPoi[] => getCampusOutdoorPois(campus).filter((poi) => poi.category === category);

export const findNearbyOutdoorPois = (
  campus: Campus,
  category: PoiCategory,
  radiusMeters: number = POI_SEARCH_RADIUS_METERS,
  limit: number = POI_RESULT_LIMIT,
): NearbyOutdoorPoiResult[] => {
  const campusCenter = getCampusRegion(campus);

  return getCampusOutdoorPoisByCategory(campus, category)
    .map((poi) => ({
      poi,
      distance: getDistance(
        {
          latitude: campusCenter.latitude,
          longitude: campusCenter.longitude,
        },
        {
          latitude: poi.latitude,
          longitude: poi.longitude,
        },
      ),
    }))
    .filter((entry) => entry.distance <= radiusMeters)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit);
};
