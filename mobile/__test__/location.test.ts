import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import {
  getCurrentLocation,
  getLocationPermissionStatus,
  hasLocationPermission,
} from '../src/utils/location';

jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
}));

describe('location utils', () => {
  const locationMock = Location as jest.Mocked<typeof Location>;
  const linkingMock = Linking as jest.Mocked<typeof Linking>;

  beforeEach(() => {
    jest.clearAllMocks();
    (locationMock as any).getCurrentPositionAsync = jest.fn();
  });

  test('returns current location when permission is granted', async () => {
    const mockPosition = {
      coords: {
        latitude: 45.5,
        longitude: -73.57,
      },
    };

    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: true,
      canAskAgain: true,
      status: 'granted',
      expires: 'never',
    } as any);
    (locationMock as any).getCurrentPositionAsync.mockResolvedValueOnce(mockPosition);

    const result = await getCurrentLocation();

    expect(result).toEqual({ latitude: 45.5, longitude: -73.57 });
    expect((locationMock as any).getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
    });
    expect(linkingMock.openSettings).not.toHaveBeenCalled();
  });

  test('returns null when permission is denied but can ask again', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: true,
      status: 'denied',
      expires: 'never',
    } as any);

    const result = await getCurrentLocation();

    expect(result).toBeNull();
    expect((locationMock as any).getCurrentPositionAsync).not.toHaveBeenCalled();
    expect(linkingMock.openSettings).not.toHaveBeenCalled();
  });

  test('opens settings and returns null when permission is denied and cannot ask again', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      granted: false,
      canAskAgain: false,
      status: 'denied',
      expires: 'never',
    } as any);

    const result = await getCurrentLocation();

    expect(result).toBeNull();
    expect(linkingMock.openSettings).toHaveBeenCalledTimes(1);
    expect((locationMock as any).getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  test('getLocationPermissionStatus returns granted', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const result = await getLocationPermissionStatus();
    expect(result).toBe('granted');
  });

  test('getLocationPermissionStatus returns denied', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const result = await getLocationPermissionStatus();
    expect(result).toBe('denied');
  });

  test('getLocationPermissionStatus returns undetermined for non-granted/denied status', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'undetermined',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const result = await getLocationPermissionStatus();
    expect(result).toBe('undetermined');
  });

  test('hasLocationPermission returns true when status is granted', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const result = await hasLocationPermission();
    expect(result).toBe(true);
  });

  test('hasLocationPermission returns false when status is denied', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const result = await hasLocationPermission();
    expect(result).toBe(false);
  });
});
