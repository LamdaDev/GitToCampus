import type { LatLng } from 'react-native-maps';
import {
  DirectionsRequest,
  DirectionsRoute,
  DirectionsServiceError,
  DirectionsTravelMode,
} from '../types/Directions';
import type { GoogleDirectionsResponse, GoogleDirectionsStatus } from '../types/GoogleDirections';
import { formatDistance, formatDuration } from '../utils/directionsFormatting';

const DIRECTIONS_API_URL = 'https://maps.googleapis.com/maps/api/directions/json';

const isFiniteCoordinate = (point: LatLng) =>
  Number.isFinite(point.latitude) && Number.isFinite(point.longitude);

const mapTravelMode = (mode: DirectionsTravelMode) => {
  switch (mode) {
    case 'walking':
      return 'walking';
    case 'driving':
      return 'driving';
    case 'transit':
      return 'transit';
  }
};

const mapStatusToErrorCode = (status: GoogleDirectionsStatus) => {
  switch (status) {
    case 'ZERO_RESULTS':
      return 'NO_ROUTE' as const;
    case 'REQUEST_DENIED':
      return 'REQUEST_DENIED' as const;
    case 'OVER_QUERY_LIMIT':
    case 'OVER_DAILY_LIMIT':
      return 'OVER_QUERY_LIMIT' as const;
    case 'INVALID_REQUEST':
    case 'MAX_ROUTE_LENGTH_EXCEEDED':
    case 'MAX_WAYPOINTS_EXCEEDED':
    case 'NOT_FOUND':
      return 'INVALID_REQUEST' as const;
    case 'UNKNOWN_ERROR':
    default:
      return 'API_ERROR' as const;
  }
};

const toQueryString = (query: Record<string, string | number>) =>
  Object.entries(query)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

const toLatLngParam = ({ latitude, longitude }: LatLng) => `${latitude},${longitude}`;

export const buildDirectionsApiUrl = (
  request: DirectionsRequest,
  apiKey: string,
  mode: DirectionsTravelMode = 'walking',
): string => {
  const query: Record<string, string | number> = {
    origin: toLatLngParam(request.origin),
    destination: toLatLngParam(request.destination),
    mode: mapTravelMode(mode),
    units: request.units ?? 'metric',
    key: apiKey,
  };

  if (request.language) {
    query.language = request.language;
  }

  if (request.departureTime) {
    query.departure_time = request.departureTime;
  }

  return `${DIRECTIONS_API_URL}?${toQueryString(query)}`;
};

export const fetchOutdoorDirections = async (
  request: DirectionsRequest,
  apiKey: string = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
): Promise<DirectionsRoute> => {
  const trimmedApiKey = apiKey.trim();
  if (!trimmedApiKey) {
    throw new DirectionsServiceError(
      'MISSING_API_KEY',
      'Google Directions API key is missing. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.',
    );
  }

  if (!isFiniteCoordinate(request.origin) || !isFiniteCoordinate(request.destination)) {
    throw new DirectionsServiceError('INVALID_COORDINATES', 'Origin or destination is invalid.');
  }

  const mode = request.mode ?? 'walking';
  const units = request.units ?? 'metric';
  const url = buildDirectionsApiUrl(request, trimmedApiKey, mode);

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new DirectionsServiceError(
      'NETWORK_ERROR',
      'Unable to reach Google Directions API. Check internet connectivity.',
      {
        providerMessage: error instanceof Error ? error.message : 'Unknown network error',
      },
    );
  }

  if (!response.ok) {
    throw new DirectionsServiceError(
      'API_ERROR',
      `Google Directions API request failed with HTTP ${response.status}.`,
      { providerMessage: response.statusText },
    );
  }

  const data = (await response.json()) as GoogleDirectionsResponse;
  if (data.status !== 'OK') {
    const code = mapStatusToErrorCode(data.status);
    throw new DirectionsServiceError(code, data.error_message ?? `Directions request failed.`, {
      providerStatus: data.status,
      providerMessage: data.error_message,
    });
  }

  const route = data.routes?.[0];
  if (!route || !route.overview_polyline?.points) {
    throw new DirectionsServiceError('NO_ROUTE', 'No valid outdoor route was returned.');
  }

  const legs = route.legs ?? [];
  const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0);
  const durationSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0);
  const distanceText = legs[0]?.distance?.text ?? formatDistance(distanceMeters, units);
  const durationText = legs[0]?.duration?.text ?? formatDuration(durationSeconds);

  const bounds =
    route.bounds?.northeast && route.bounds?.southwest
      ? {
          northeast: {
            latitude: route.bounds.northeast.lat,
            longitude: route.bounds.northeast.lng,
          },
          southwest: {
            latitude: route.bounds.southwest.lat,
            longitude: route.bounds.southwest.lng,
          },
        }
      : null;

  return {
    polyline: route.overview_polyline.points,
    distanceMeters,
    distanceText,
    durationSeconds,
    durationText,
    bounds,
  };
};
