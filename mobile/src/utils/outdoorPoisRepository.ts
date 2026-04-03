import { getDistance } from 'geolib';
import { getCampusRegion } from '../constants/campuses';
import { OUTDOOR_POIS } from '../constants/outdoorPois';
import { POI_RESULT_LIMIT } from '../constants/poi';
import type { Campus } from '../types/Campus';
import type { OutdoorPoi, PoiCategory, PoiRangeKm } from '../types/Poi';

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

const POI_RANGE_BUCKET_THRESHOLDS: Record<Campus, Record<PoiCategory, readonly number[]>> = {
  SGW: {
    cafe: [7, 12],
    restaurant: [9, 12],
    depanneur: [3, 5],
  },
  LOYOLA: {
    cafe: [2, 7],
    restaurant: [4, 10],
    depanneur: [3, 5],
  },
} as const;

const getPoiSequenceNumber = (poi: OutdoorPoi): number => {
  const segments = poi.id.split('-');
  const rawSequence = segments.at(-1) ?? '';
  const parsedSequence = Number.parseInt(rawSequence, 10);
  return Number.isFinite(parsedSequence) ? parsedSequence : Number.MAX_SAFE_INTEGER;
};

const getPoiRangeBucketKm = (poi: OutdoorPoi): PoiRangeKm => {
  const sequenceNumber = getPoiSequenceNumber(poi);
  const [firstBucketMax, secondBucketMax] = POI_RANGE_BUCKET_THRESHOLDS[poi.campus][poi.category];

  if (sequenceNumber <= firstBucketMax) return 1;
  if (sequenceNumber <= secondBucketMax) return 2;
  return 3;
};

export const findNearbyOutdoorPois = (
  campus: Campus,
  category: PoiCategory,
  maxRangeKm: PoiRangeKm = 3,
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
    .filter((entry) => getPoiRangeBucketKm(entry.poi) <= maxRangeKm)
    .sort((left, right) => left.distance - right.distance)
    .slice(0, limit);
};
