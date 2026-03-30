import type { PoiCategory } from '../types/Poi';

export const POI_SEARCH_RADIUS_METERS = 3000;
export const POI_RESULT_LIMIT = 30;

export const POI_CATEGORY_LABELS: Record<PoiCategory, string> = {
  cafe: 'Cafes',
  restaurant: 'Restaurants',
};

export const POI_MARKER_THEME: Record<
  PoiCategory,
  { iconName: 'cafe-outline' | 'restaurant-outline'; color: string; selectedColor: string }
> = {
  cafe: {
    iconName: 'cafe-outline',
    color: '#8c5a2b',
    selectedColor: '#d97706',
  },
  restaurant: {
    iconName: 'restaurant-outline',
    color: '#9f1239',
    selectedColor: '#ef4444',
  },
};
