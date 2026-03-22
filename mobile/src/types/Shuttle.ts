import type { LatLng } from 'react-native-maps';

import type { Campus } from './Campus';

export type ShuttleDirection = 'SGW_TO_LOYOLA' | 'LOYOLA_TO_SGW';

export type ShuttleStopRef = {
  id: string;
  campus: Campus;
  name: string;
  coords: LatLng;
};

export type ShuttlePlanLegKind = 'pre_shuttle_walk' | 'shuttle_ride' | 'post_shuttle_walk';

export type ShuttlePlanLegMode = 'walking' | 'shuttle';

export type ShuttlePlanLeg = {
  kind: ShuttlePlanLegKind;
  mode: ShuttlePlanLegMode;
  origin: LatLng | null;
  destination: LatLng | null;
  originStop?: ShuttleStopRef | null;
  destinationStop?: ShuttleStopRef | null;
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
  preShuttleWalk?: ShuttlePlanLeg | null;
  shuttleRide?: ShuttlePlanLeg | null;
  postShuttleWalk?: ShuttlePlanLeg | null;
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
  destinationCoords?: LatLng | null;
  now?: Date;
  count?: number;
};
