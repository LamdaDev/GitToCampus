import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export type UserLocationCoords = {
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
