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
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();

  if (!granted) {
    if (!canAskAgain) {
      await Linking.openSettings();
    }
    return null;
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
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
