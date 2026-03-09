import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export type UserLocationCoords = {
  latitude: number;
  longitude: number;
};

type CoordinateLike = {
  latitude: number;
  longitude: number;
};

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';
export type CurrentLocationResult =
  | { type: 'success'; coords: UserLocationCoords }
  | { type: 'permission_denied'; canAskAgain: boolean }
  | { type: 'unavailable'; message: string };

/**
 * Request and return foreground location permission status.
 */
export async function getLocationPermissionStatus(): Promise<LocationPermissionStatus> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

/**
 * Get current user location if permission is granted.
 * Opens settings if permission is denied permanently.
 * Returns null if permission is not granted.
 */
export async function getCurrentLocation(): Promise<UserLocationCoords | null> {
  const result = await getCurrentLocationResult();
  if (result.type !== 'success') return null;
  return result.coords;
}

/**
 * Get detailed location resolution result for permission-aware flows.
 */
export async function getCurrentLocationResult(): Promise<CurrentLocationResult> {
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();

  if (!granted) {
    if (!canAskAgain) {
      await Linking.openSettings();
    }
    return { type: 'permission_denied', canAskAgain };
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      type: 'success',
      coords: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Unable to determine your current location.';
    return { type: 'unavailable', message };
  }
}

/**
 * Check if location permission has been granted.
 */
export async function hasLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const getDistanceMeters = (from: CoordinateLike, to: CoordinateLike): number => {
  const fromLat = toRadians(from.latitude);
  const fromLon = toRadians(from.longitude);
  const toLat = toRadians(to.latitude);
  const toLon = toRadians(to.longitude);

  const deltaLat = toLat - fromLat;
  const deltaLon = toLon - fromLon;

  const haversineTerm =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLon / 2) ** 2;
  const angularDistance = 2 * Math.atan2(Math.sqrt(haversineTerm), Math.sqrt(1 - haversineTerm));

  return EARTH_RADIUS_METERS * angularDistance;
};
