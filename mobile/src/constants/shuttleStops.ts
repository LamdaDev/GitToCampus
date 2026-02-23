import type { LatLng } from 'react-native-maps';

import type { Campus } from '../types/Campus';

export type ShuttleStop = {
  id: string;
  campus: Campus;
  name: string;
  coords: LatLng;
};

export const SHUTTLE_STOPS: ShuttleStop[] = [
  {
    id: 'sgw-hall',
    campus: 'SGW',
    name: 'SGW Shuttle Stop (Hall Building)',
    coords: { latitude: 45.497193, longitude: -73.578985 },
  },
  {
    id: 'sgw-gm',
    campus: 'SGW',
    name: 'SGW Shuttle Stop (Guy / De Maisonneuve)',
    coords: { latitude: 45.49583, longitude: -73.579385 },
  },
  {
    id: 'loy-ad',
    campus: 'LOYOLA',
    name: 'Loyola Shuttle Stop (AD Building)',
    coords: { latitude: 45.458317, longitude: -73.640225 },
  },
  {
    id: 'loy-sherbrooke',
    campus: 'LOYOLA',
    name: 'Loyola Shuttle Stop (Sherbrooke / Terrebonne)',
    coords: { latitude: 45.458908, longitude: -73.641169 },
  },
];
