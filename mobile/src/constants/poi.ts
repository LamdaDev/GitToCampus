import type { PoiCategory } from '../types/Poi';

export const POI_SEARCH_RADIUS_METERS = 3000;
export const POI_RESULT_LIMIT = 30;

export const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  cafe: 'Cafes',
  restaurant: 'Restaurants',
};
