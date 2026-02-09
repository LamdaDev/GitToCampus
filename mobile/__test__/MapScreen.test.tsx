import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Marker, Polygon } from 'react-native-maps';
import MapScreen from '../src/screens/MapScreen';
import type { BuildingShape } from '../src/types/BuildingShape';
import * as buildingsRepository from '../src/utils/buildingsRepository';
import * as geoJson from '../src/utils/geoJson';
import { getCampusRegion } from '../src/constants/campuses';

const mockPassSelectedBuilding = jest.fn();
const mockOpenBottomSheet = jest.fn();
const mockAnimateToRegion = jest.fn();
let mockHasAnimateToRegion = true;

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () =>
      mockHasAnimateToRegion ? { animateToRegion: mockAnimateToRegion } : {},
    );
    return React.createElement(View, props, props.children);
  });

  const MockPolygon = (props: any) => React.createElement(View, props, props.children);
  const MockMarker = (props: any) =>
    React.createElement(
      View,
      { ...props, testID: props.testID ?? 'map-marker' },
      props.children,
    );

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('../src/utils/buildingsRepository', () => ({
  getCampusBuildingShapes: jest.fn(),
  getBuildingShapeById: jest.fn(),
  findBuildingAt: jest.fn(),
}));

jest.mock('../src/utils/geoJson', () => {
  const actual = jest.requireActual('../src/utils/geoJson');
  return {
    ...actual,
    centroidOfPolygon: jest.fn(),
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

describe('MapScreen', () => {
  const locationMock = Location as jest.Mocked<typeof Location>;
  const repoMock = buildingsRepository as jest.Mocked<typeof buildingsRepository>;
  const geoJsonMock = geoJson as jest.Mocked<typeof geoJson>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockHasAnimateToRegion = true;

    repoMock.getCampusBuildingShapes.mockImplementation((campus: 'SGW' | 'LOYOLA') =>
      mockBuildings.filter((b) => b.campus === campus),
    );
    repoMock.getBuildingShapeById.mockImplementation((id: string) =>
      mockBuildings.find((b) => b.id === id),
    );
    repoMock.findBuildingAt.mockReturnValue(undefined);

    geoJsonMock.centroidOfPolygon.mockImplementation((polygon: any) => {
      if (!polygon || polygon.length === 0) return null;
      let latSum = 0;
      let lonSum = 0;
      for (const p of polygon) {
        latSum += p.latitude;
        lonSum += p.longitude;
      }
      return { latitude: latSum / polygon.length, longitude: lonSum / polygon.length };
    });

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

  test('renders polygons and animates to initial campus', async () => {
    const { UNSAFE_getAllByType } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    expect(UNSAFE_getAllByType(Polygon)).toHaveLength(3);

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('SGW'), 1000);
    });
  });

  test('selecting polygon updates selection, parent callback, sheet open, and marker', async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');

    await waitFor(() => {
      expect(mockPassSelectedBuilding).toHaveBeenCalledWith(mockBuildings[1]);
      expect(mockOpenBottomSheet).toHaveBeenCalledTimes(1);
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
    });

    const marker = getByTestId('map-marker');
    expect(marker.props.title).toBe('Administration');
  });

  test('uses fallback marker coordinates when centroid is null', async () => {
    geoJsonMock.centroidOfPolygon.mockReturnValueOnce(null);

    const { UNSAFE_getAllByType, getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[0], 'press');

    await waitFor(() => {
      const marker = getByTestId('map-marker');
      expect(marker.props.coordinate).toEqual({ latitude: 0, longitude: 0 });
    });
  });

  test('toggle switches campus and clears selected marker', async () => {
    const { UNSAFE_getAllByType, getByLabelText, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[0], 'press');

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
    });

    fireEvent.press(getByLabelText('Toggle Campus'));

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(0);
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
    });
  });

  test('toggle switches campus back from LOYOLA to SGW', async () => {
    const { UNSAFE_getAllByType, getByLabelText } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');
    fireEvent.press(getByLabelText('Toggle Campus'));

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('SGW'), 1000);
    });
  });

  test('permission denied skips location watching', async () => {
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    expect(locationMock.watchPositionAsync).not.toHaveBeenCalled();
  });

  test('auto-selects building based on location updates', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    repoMock.findBuildingAt.mockReturnValue(mockBuildings[1]);
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    act(() => {
      locationCallback?.({ coords: { latitude: 45.52, longitude: -73.59 } });
    });

    await waitFor(() => {
      expect(repoMock.findBuildingAt).toHaveBeenCalledWith({ latitude: 45.52, longitude: -73.59 });
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
    });
  });

  test('clears selected building when user is not inside a building', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    repoMock.findBuildingAt.mockReturnValue(undefined);
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { UNSAFE_getAllByType, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[0], 'press');

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
    });

    act(() => {
      locationCallback?.({ coords: { latitude: 0, longitude: 0 } });
    });

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(0);
    });
  });

  test('handles building containment errors and does not crash', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    repoMock.findBuildingAt.mockImplementation(() => {
      throw new Error('containment failure');
    });
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    act(() => {
      locationCallback?.({ coords: { latitude: 45.5, longitude: -73.57 } });
    });

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        'Error checking building containment',
        expect.any(Error),
      );
    });

    warnSpy.mockRestore();
  });

  test('handles missing building metadata on press and no animateToRegion ref', async () => {
    mockHasAnimateToRegion = false;
    repoMock.getBuildingShapeById.mockReturnValue(undefined);

    const { UNSAFE_getAllByType, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');

    await waitFor(() => {
      expect(mockPassSelectedBuilding).toHaveBeenCalledWith(null);
      expect(mockOpenBottomSheet).toHaveBeenCalledTimes(1);
    });

    expect(queryAllByTestId('map-marker')).toHaveLength(0);
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  test('removes location subscription on unmount', async () => {
    const remove = jest.fn();
    locationMock.watchPositionAsync.mockResolvedValueOnce({ remove } as any);

    const { unmount } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        openBottomSheet={mockOpenBottomSheet}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
