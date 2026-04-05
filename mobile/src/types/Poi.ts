import type { Campus } from './Campus';

export type PoiCategory = 'cafe' | 'restaurant' | 'depanneur';
export type PoiCategorySelection = PoiCategory[];
export type PoiRangeKm = 1 | 2 | 3;

export type OutdoorPoi = {
  id: string;
  name: string;
  category: PoiCategory;
  campus: Campus;
  latitude: number;
  longitude: number;
  address: string;
};
