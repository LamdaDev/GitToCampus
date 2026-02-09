import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { getCurrentLocation } from '../src/utils/location';

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

    expect(result).toEqual(mockPosition);
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
});
