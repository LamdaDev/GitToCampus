import type { Campus } from './Campus';

export type PoiCategory = 'cafe' | 'restaurant';

export type OutdoorPoi = {
  id: string;
  name: string;
  category: PoiCategory;
  campus: Campus;
  latitude: number;
  longitude: number;
  address: string;
};
