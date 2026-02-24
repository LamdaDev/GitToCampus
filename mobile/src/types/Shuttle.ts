import type { LatLng } from 'react-native-maps';

import type { Campus } from './Campus';

export type ShuttleDirection = 'SGW_TO_LOYOLA' | 'LOYOLA_TO_SGW';

export type ShuttleStopRef = {
  id: string;
  campus: Campus;
  name: string;
  coords: LatLng;
};

export type ShuttleDepartureLookup = {
  departures: Date[];
  isServiceAvailable: boolean;
  reason?: string;
};

export type ShuttlePlan = {
  direction: ShuttleDirection;
  pickup: ShuttleStopRef | null;
  dropoff: ShuttleStopRef | null;
  nextDepartures: string[];
  nextDepartureDates: Date[];
  nextDepartureInMinutes: number | null;
  isServiceAvailable: boolean;
  message?: string;
};

export type ShuttlePlanRequest = {
  startCampus: Campus | null;
  destinationCampus: Campus | null;
  startCoords?: LatLng | null;
  now?: Date;
  count?: number;
};
