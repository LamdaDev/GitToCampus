import type { LatLng } from 'react-native-maps';

export type DirectionsTravelMode = 'walking' | 'driving' | 'transit';

export type DirectionsUnits = 'metric' | 'imperial';

export type DirectionsRequest = {
  origin: LatLng;
  destination: LatLng;
  mode?: DirectionsTravelMode;
  units?: DirectionsUnits;
  language?: string;
  departureTime?: 'now' | number;
};

export type DirectionsBounds = {
  northeast: LatLng;
  southwest: LatLng;
};

export type TransitInstruction = {
  id: string;
  type: 'walk' | 'transit';
  title: string;
  subtitle?: string | null;
  detail?: string | null;
  departureTimeText?: string | null;
  arrivalTimeText?: string | null;
  departureStopName?: string | null;
  arrivalStopName?: string | null;
  lineShortName?: string | null;
  lineColor?: string | null;
  lineTextColor?: string | null;
  vehicleType?: string | null;
};

export type DirectionsRoute = {
  polyline: string;
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
  bounds: DirectionsBounds | null;
  transitInstructions?: TransitInstruction[];
};

export type DirectionsErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_COORDINATES'
  | 'NO_ROUTE'
  | 'REQUEST_DENIED'
  | 'OVER_QUERY_LIMIT'
  | 'INVALID_REQUEST'
  | 'NETWORK_ERROR'
  | 'API_ERROR';

export class DirectionsServiceError extends Error {
  code: DirectionsErrorCode;
  providerStatus?: string;
  providerMessage?: string;

  constructor(
    code: DirectionsErrorCode,
    message: string,
    options?: { providerStatus?: string; providerMessage?: string },
  ) {
    super(message);
    this.name = 'DirectionsServiceError';
    this.code = code;
    this.providerStatus = options?.providerStatus;
    this.providerMessage = options?.providerMessage;
  }
}
