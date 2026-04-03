import type { PoiCategory } from '../types/Poi';

export type PoiMarkerTheme = {
  iconName: 'cafe-outline' | 'restaurant-outline' | 'storefront-outline';
  color: string;
  selectedColor: string;
};

export const POI_MARKER_THEME: Record<PoiCategory, PoiMarkerTheme> = {
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
  depanneur: {
    iconName: 'storefront-outline',
    color: '#0f766e',
    selectedColor: '#14b8a6',
  },
};
