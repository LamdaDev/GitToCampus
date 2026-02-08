import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Marker, Polygon } from 'react-native-maps';
import MapScreen from '../src/screens/MapScreen';
import type { BuildingShape } from '../src/types/BuildingShape';
import { getCampusRegion } from '../src/constants/campuses';
import * as buildingsRepository from '../src/utils/buildingsRepository';

const mockAnimateToRegion = jest.fn();
let mockHasAnimateToRegion = true;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      ...(mockHasAnimateToRegion ? { animateToRegion: mockAnimateToRegion } : {}),
    }));

    return React.createElement(View, props, props.children);
  });

  const MockPolygon = (props: any) => React.createElement(View, props, props.children);
  const MockMarker = (props: any) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'mock-marker' }, props.children);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    PROVIDER_GOOGLE: 'google',
  };
});

const mockBuildings: BuildingShape[] = [
  {
    id: 'sgw-1',
    campus: 'SGW',
    name: 'Hall Building',
    polygons: [
      [
        { latitude: 45.5, longitude: -73.57 },
        { latitude: 45.5, longitude: -73.58 },
        { latitude: 45.51, longitude: -73.58 },
      ],
    ],
  },
  {
    id: 'loy-1',
    campus: 'LOYOLA',
    name: 'Administration',
    polygons: [
      [
        { latitude: 45.52, longitude: -73.59 },
        { latitude: 45.52, longitude: -73.6 },
        { latitude: 45.53, longitude: -73.6 },
      ],
      [
        { latitude: 45.54, longitude: -73.61 },
        { latitude: 45.54, longitude: -73.62 },
        { latitude: 45.55, longitude: -73.62 },
      ],
    ],
  },
];

jest.mock('../src/utils/buildingsRepository', () => ({
  getCampusBuildingShapes: jest.fn(),
  getBuildingShapeById: jest.fn(),
}));

describe('MapScreen', () => {
  const locationMock = Location as jest.Mocked<typeof Location>;
  const repoMock = buildingsRepository as jest.Mocked<typeof buildingsRepository>;

  beforeEach(() => {
    mockHasAnimateToRegion = true;
    mockAnimateToRegion.mockClear();
    repoMock.getCampusBuildingShapes.mockClear();
    repoMock.getBuildingShapeById.mockClear();
    repoMock.getCampusBuildingShapes.mockImplementation((campus: 'SGW' | 'LOYOLA') =>
      mockBuildings.filter((b) => b.campus === campus),
    );
    repoMock.getBuildingShapeById.mockImplementation((id: string) =>
      mockBuildings.find((b) => b.id === id),
    );
    locationMock.requestForegroundPermissionsAsync.mockClear();
    locationMock.watchPositionAsync.mockClear();
    locationMock.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    } as any);
    locationMock.watchPositionAsync.mockResolvedValue({
      remove: jest.fn(),
    } as any);
  });

  test('renders overlay with default camera target and prompt', async () => {
    const { getByText } = render(<MapScreen />);

    expect(getByText('GitToCampus')).toBeTruthy();
    expect(getByText('Camera target: SGW')).toBeTruthy();
    expect(getByText('Tap a building')).toBeTruthy();

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });
  });

  test('renders one polygon per building polygon', () => {
    const { UNSAFE_getAllByType } = render(<MapScreen />);

    const polygons = UNSAFE_getAllByType(Polygon);
    expect(polygons).toHaveLength(3);
  });

  test('selecting a polygon updates selected building and camera target', async () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = render(<MapScreen />);

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('SGW'), 1000);
    });

    const polygons = UNSAFE_getAllByType(Polygon);
    // First polygon is SGW, next polygons are Loyola
    fireEvent(polygons[1], 'press');

    expect(getByText('Camera target: LOYOLA')).toBeTruthy();
    expect(getByText('Selected: Administration')).toBeTruthy();
    expect(queryByText('Tap a building')).toBeNull();

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
    });
  });

  test('handles selected id that has no matching building metadata', async () => {
    repoMock.getBuildingShapeById.mockReturnValueOnce(undefined);

    const { getByText, queryByText, UNSAFE_getAllByType } = render(<MapScreen />);
    const polygons = UNSAFE_getAllByType(Polygon);

    fireEvent(polygons[1], 'press');

    await waitFor(() => {
      expect(getByText('Camera target: LOYOLA')).toBeTruthy();
    });

    expect(queryByText('Selected: Administration')).toBeNull();
    expect(getByText('Tap a building')).toBeTruthy();
  });

  test('shows location permission error when permission is denied', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    const { getByText } = render(<MapScreen />);

    await waitFor(() => {
      expect(getByText('Location permission denied')).toBeTruthy();
    });

    expect(locationMock.watchPositionAsync).not.toHaveBeenCalled();
  });

  test('does not attempt camera animation when map ref has no animateToRegion', async () => {
    mockHasAnimateToRegion = false;
    render(<MapScreen />);

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  test('renders user marker from location updates and cleans up subscription on unmount', async () => {
    const remove = jest.fn();
    locationMock.watchPositionAsync.mockImplementationOnce(async (_options: any, callback: any) => {
      callback({
        coords: { latitude: 45.501, longitude: -73.567 },
      });
      return { remove } as any;
    });

    const { UNSAFE_getAllByType, unmount } = render(<MapScreen />);

    await waitFor(() => {
      const markers = UNSAFE_getAllByType(Marker);
      expect(markers).toHaveLength(1);
    });

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
