import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import * as ReactNative from 'react-native';
import { Polygon } from 'react-native-maps';
import MapScreen from '../src/screens/MapScreen';
import type { BuildingShape } from '../src/types/BuildingShape';
import * as buildingsRepository from '../src/utils/buildingsRepository';
import * as geoJson from '../src/utils/geoJson';
import { getCampusRegion } from '../src/constants/campuses';
import { POLYGON_THEME } from '../src/styles/MapScreen.styles';

const mockPassSelectedBuilding = jest.fn();
const mockPassUserLocation = jest.fn();
const mockPassCurrentBuilding = jest.fn();
const mockOpenBottomSheet = jest.fn();
const mockOnMapPress = jest.fn();
const mockOnOpenCalendar = jest.fn();
const mockAnimateToRegion = jest.fn();
const mockFitToCoordinates = jest.fn();
const mockHideAppSearchBar = jest.fn();
const mockRevealSearchBar = jest.fn();
const mockExitIndoorView = jest.fn();
let mockHasAnimateToRegion = true;
const originalPlatformOSDescriptor = Object.getOwnPropertyDescriptor(Platform, 'OS');

const mockPlatformOS = (os: 'ios' | 'android') => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
};

const restorePlatformOS = () => {
  if (originalPlatformOSDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformOSDescriptor);
  }
};

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () =>
      mockHasAnimateToRegion
        ? { animateToRegion: mockAnimateToRegion, fitToCoordinates: mockFitToCoordinates }
        : {},
    );
    return React.createElement(View, props, props.children);
  });

  const MockPolygon = (props: any) => React.createElement(View, props, props.children);
  const MockPolyline = (props: any) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'map-polyline' }, props.children);
  const MockMarker = (props: any) =>
    React.createElement(View, { ...props, testID: props.testID ?? 'map-marker' }, props.children);

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polygon: MockPolygon,
    Polyline: MockPolyline,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('../src/utils/buildingsRepository', () => ({
  getCampusBuildingShapes: jest.fn(),
  getBuildingShapeById: jest.fn(),
  findBuildingAt: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  openSettings: jest.fn(),
}));

jest.mock('../src/utils/geoJson', () => {
  const actual = jest.requireActual('../src/utils/geoJson');
  return {
    ...actual,
    centroidOfPolygon: jest.fn(),
  };
});

jest.mock('@turf/turf', () => ({
  polygon: jest.fn(),
  pointOnFeature: jest.fn(() => ({
    geometry: { coordinates: [0, 0] },
  })),
}));

const mockBuildings: BuildingShape[] = [
  {
    id: 'sgw-1',
    campus: 'SGW',
    name: 'Hall Building',
    images: [
      'https://iili.io/qqoKrrB.png',
      'https://iili.io/qqonjDX.png',
      'https://iili.io/qqoEmDg.png',
    ],
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
    images: [
      'https://i.postimg.cc/SQvBP4sZ/1750701647513.jpg',
      'https://i.postimg.cc/FRnBwb9L/download.jpg',
      'https://i.postimg.cc/KjkHbKz9/download.jpg',
    ],
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
  const linkingMock = Linking as jest.Mocked<typeof Linking>;
  const repoMock = buildingsRepository as jest.Mocked<typeof buildingsRepository>;
  const geoJsonMock = geoJson as jest.Mocked<typeof geoJson>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHasAnimateToRegion = true;
    mockFitToCoordinates.mockClear();
    mockOnMapPress.mockClear();
    mockOnOpenCalendar.mockClear();

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
    (locationMock as any).getCurrentPositionAsync = jest.fn().mockResolvedValue({
      coords: {
        latitude: 45.5,
        longitude: -73.57,
      },
    } as any);
    locationMock.watchPositionAsync.mockResolvedValue({
      remove: jest.fn(),
    } as any);
  });

  test('renders polygons and animates to initial campus', async () => {
    const { UNSAFE_getAllByType } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    expect(UNSAFE_getAllByType(Polygon)).toHaveLength(3);

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('SGW'), 1000);
    });
  });

  test('calls onMapPress callback when map background is pressed', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        onMapPress={mockOnMapPress}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent.press(getByTestId('campus-map'));

    expect(mockOnMapPress).toHaveBeenCalledTimes(1);
  });

  test('map background press clears manual selection and marker', async () => {
    const { UNSAFE_getAllByType, getByTestId, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    fireEvent.press(getByTestId('campus-map'));

    await waitFor(() => {
      expect(queryAllByTestId('map-marker')).toHaveLength(0);
      expect(mockPassSelectedBuilding).toHaveBeenLastCalledWith(null);
    });
  });

  test('ignores immediate map press after polygon press to keep selected building', async () => {
    const { UNSAFE_getAllByType, getByTestId, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        onMapPress={mockOnMapPress}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');
    fireEvent.press(getByTestId('campus-map'));

    await waitFor(() => {
      expect(mockPassSelectedBuilding).toHaveBeenCalledWith(mockBuildings[1]);
      expect(mockOnMapPress).not.toHaveBeenCalled();
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
    });
  });

  test('calls onOpenCalendar when the calendar control is pressed', async () => {
    const { getByLabelText } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        onOpenCalendar={mockOnOpenCalendar}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent.press(getByLabelText('Open Calendar'));
    expect(mockOnOpenCalendar).toHaveBeenCalledTimes(1);
  });

  test('selecting polygon updates selection, parent callback, sheet open, and marker', async () => {
    const { UNSAFE_getAllByType, getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');
    fireEvent.press(getByLabelText('Toggle Campus'));

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('SGW'), 1000);
    });
  });

  test('permission denied skips location watching', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
      expires: 'never',
    } as any);

    render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    expect(locationMock.watchPositionAsync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Location permission denied');
    warnSpy.mockRestore();
  });

  test('opens settings when permission is denied and cannot ask again', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    locationMock.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    } as any);

    render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(linkingMock.openSettings).toHaveBeenCalledTimes(1);
    });

    expect(locationMock.watchPositionAsync).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Location permission denied');
    warnSpy.mockRestore();
  });

  test('updates current building and campus based on location updates without forcing marker selection', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    repoMock.findBuildingAt.mockReturnValue(mockBuildings[1]);
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
      expect(mockPassCurrentBuilding).toHaveBeenLastCalledWith(mockBuildings[1]);
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
      expect(queryAllByTestId('map-marker')).toHaveLength(0);
    });
  });

  test('highlights current building polygon when location enters a building', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    repoMock.findBuildingAt.mockReturnValue(mockBuildings[1]);
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { UNSAFE_getAllByType } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    act(() => {
      locationCallback?.({ coords: { latitude: 45.52, longitude: -73.59 } });
    });

    await waitFor(() => {
      const polygons = UNSAFE_getAllByType(Polygon);
      const loyolaPolygon = polygons[1];
      expect(loyolaPolygon.props.fillColor).toBe(POLYGON_THEME.LOYOLA.currentFill);
      expect(loyolaPolygon.props.strokeColor).toBe(POLYGON_THEME.LOYOLA.currentStroke);
      expect(loyolaPolygon.props.strokeWidth).toBe(POLYGON_THEME.LOYOLA.currentStrokeWidth);
    });
  });

  test('does not clear manually selected building marker when user is not inside a building', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    repoMock.findBuildingAt.mockReturnValue(undefined);
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { UNSAFE_getAllByType, queryAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
      expect(mockPassCurrentBuilding).toHaveBeenLastCalledWith(null);
      expect(queryAllByTestId('map-marker')).toHaveLength(1);
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
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
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

  test('clears pending polygon press guard timeout on unmount', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { UNSAFE_getAllByType, unmount } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[0], 'press');
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test('replaces pending polygon press guard timeout on rapid consecutive polygon presses', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { UNSAFE_getAllByType } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    const polygons = UNSAFE_getAllByType(Polygon);
    fireEvent(polygons[0], 'press');
    fireEvent(polygons[1], 'press');

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  test('recenter animates to user location when available', async () => {
    let locationCallback: ((value: any) => void) | undefined;
    locationMock.watchPositionAsync.mockImplementationOnce(async (_opts: any, cb: any) => {
      locationCallback = cb;
      return { remove: jest.fn() } as any;
    });

    const { getByLabelText } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    act(() => {
      locationCallback?.({ coords: { latitude: 45.501, longitude: -73.567 } });
    });

    mockAnimateToRegion.mockClear();
    fireEvent.press(getByLabelText('Recenter Map'));

    await waitFor(() => {
      expect(mockAnimateToRegion).toHaveBeenCalledWith(
        {
          latitude: 45.501,
          longitude: -73.567,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000,
      );
    });
  });

  test('recenter does nothing when user location is unavailable', async () => {
    const { getByLabelText } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    mockAnimateToRegion.mockClear();
    fireEvent.press(getByLabelText('Recenter Map'));
    expect(mockAnimateToRegion).not.toHaveBeenCalled();
  });

  test('removes location subscription on unmount', async () => {
    const remove = jest.fn();
    locationMock.watchPositionAsync.mockResolvedValueOnce({ remove } as any);

    const { unmount } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    unmount();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('removes late location subscription when component unmounts before watch resolves', async () => {
    const remove = jest.fn();
    let resolveWatchSubscription: ((subscription: { remove: jest.Mock }) => void) | null = null;

    locationMock.watchPositionAsync.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveWatchSubscription = resolve as (subscription: { remove: jest.Mock }) => void;
        }) as any,
    );

    const { unmount } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      expect(locationMock.watchPositionAsync).toHaveBeenCalledTimes(1);
    });

    unmount();

    await act(async () => {
      resolveWatchSubscription?.({ remove });
      await Promise.resolve();
    });

    expect(remove).toHaveBeenCalledTimes(1);
  });

  test('renders route polyline with start and end markers when outdoorRoute is provided', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        }}
      />,
    );

    await waitFor(() => {
      const routePolyline = getByTestId('route-polyline');
      expect(routePolyline).toBeTruthy();
      expect(routePolyline.props.strokeColor).toBe('#0472f8');
      expect(routePolyline.props.strokeWidth).toBe(6);
      expect(routePolyline.props.strokeColors).toBeUndefined();
      expect(getByTestId('route-start-marker').props.coordinate).toEqual({
        latitude: 45.5,
        longitude: -73.57,
      });
      expect(getByTestId('route-end-marker').props.coordinate).toEqual({
        latitude: 45.49,
        longitude: -73.58,
      });
      expect(mockFitToCoordinates).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          animated: true,
          edgePadding: expect.any(Object),
        }),
      );
    });
  });

  test('renders dashed route polyline when route requires walking', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
          isWalkingRoute: true,
        }}
      />,
    );

    await waitFor(() => {
      const routePolyline = getByTestId('route-polyline');
      expect(routePolyline.props.lineDashPattern).toEqual([12, 8]);
      expect(routePolyline.props.lineCap).toBe('butt');
    });
  });

  test('renders mixed route segments with dashed walking and solid transit polylines', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
          routeSegments: [
            {
              encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
              requiresWalking: true,
            },
            {
              encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
              requiresWalking: false,
            },
          ],
        }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline').props.lineDashPattern).toEqual([12, 8]);
      expect(getByTestId('route-polyline').props.lineCap).toBe('butt');
      expect(getByTestId('route-polyline-segment-1').props.lineDashPattern).toBeUndefined();
      expect(getByTestId('route-polyline-segment-1').props.lineCap).toBe('round');
    });
  });

  test('switches route polyline style cleanly between walking and driving', async () => {
    const route = {
      encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      start: { latitude: 45.5, longitude: -73.57 },
      destination: { latitude: 45.49, longitude: -73.58 },
    };

    const { getByTestId, rerender } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{ ...route, isWalkingRoute: true }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline').props.lineDashPattern).toEqual([12, 8]);
      expect(getByTestId('route-polyline').props.lineCap).toBe('butt');
    });

    rerender(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{ ...route, isWalkingRoute: false }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline').props.lineDashPattern).toBeUndefined();
      expect(getByTestId('route-polyline').props.lineCap).toBe('round');
    });

    rerender(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{ ...route, isWalkingRoute: true }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline').props.lineDashPattern).toEqual([12, 8]);
      expect(getByTestId('route-polyline').props.lineCap).toBe('butt');
    });
  });

  test('skips route fitting when map ref does not expose fitToCoordinates', async () => {
    mockHasAnimateToRegion = false;

    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline')).toBeTruthy();
    });

    expect(mockFitToCoordinates).not.toHaveBeenCalled();
  });

  test('applies external selected building to marker and campus region', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        externalSelectedBuilding={mockBuildings[1]}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('map-marker').props.title).toBe('Administration');
      expect(mockAnimateToRegion).toHaveBeenCalledWith(getCampusRegion('LOYOLA'), 1000);
    });
  });

  test('uses iOS route stroke props for route polyline', async () => {
    mockPlatformOS('ios');

    try {
      const { getByTestId } = render(
        <MapScreen
          passSelectedBuilding={mockPassSelectedBuilding}
          passUserLocation={mockPassUserLocation}
          passCurrentBuilding={mockPassCurrentBuilding}
          openBottomSheet={mockOpenBottomSheet}
          hideAppSearchBar={mockHideAppSearchBar}
          revealSearchBar={mockRevealSearchBar}
          exitIndoorView={mockExitIndoorView}
          outdoorRoute={{
            encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            start: { latitude: 45.5, longitude: -73.57 },
            destination: { latitude: 45.49, longitude: -73.58 },
          }}
        />,
      );

      await waitFor(() => {
        const routePolyline = getByTestId('route-polyline');
        expect(routePolyline.props.strokeColor).toBe('#0472f8');
        expect(routePolyline.props.strokeColors).toBeUndefined();
      });
    } finally {
      restorePlatformOS();
    }
  });

  test('uses Android route stroke props for route polyline', async () => {
    mockPlatformOS('android');

    try {
      const { getByTestId } = render(
        <MapScreen
          passSelectedBuilding={mockPassSelectedBuilding}
          passUserLocation={mockPassUserLocation}
          passCurrentBuilding={mockPassCurrentBuilding}
          openBottomSheet={mockOpenBottomSheet}
          hideAppSearchBar={mockHideAppSearchBar}
          revealSearchBar={mockRevealSearchBar}
          exitIndoorView={mockExitIndoorView}
          outdoorRoute={{
            encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
            start: { latitude: 45.5, longitude: -73.57 },
            destination: { latitude: 45.49, longitude: -73.58 },
          }}
        />,
      );

      await waitFor(() => {
        const routePolyline = getByTestId('route-polyline');
        expect(routePolyline.props.strokeColor).toBe('#0472f8');
        expect(routePolyline.props.strokeColors).toBeUndefined();
      });
    } finally {
      restorePlatformOS();
    }
  });

  test('uses visible sheet height branch for route bottom padding when bottomSheetTop is finite', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        bottomSheetAnimatedPosition={{ value: 100 } as any}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline')).toBeTruthy();
    });

    const windowHeight = ReactNative.Dimensions.get('window').height;
    const minVisibleSheetHeight = windowHeight * 0.52;
    const visibleSheetHeight = Math.max(0, windowHeight - 100);
    const expectedBottomPadding = Math.round(
      Math.max(minVisibleSheetHeight, visibleSheetHeight) + 24,
    );

    const fitCall = mockFitToCoordinates.mock.calls.at(-1);
    expect(fitCall?.[1]?.edgePadding?.bottom).toBe(expectedBottomPadding);
  });

  test('uses fallback route bottom padding when bottomSheetTop is not finite', async () => {
    const { getByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
        bottomSheetAnimatedPosition={{ value: Number.NaN } as any}
        outdoorRoute={{
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        }}
      />,
    );

    await waitFor(() => {
      expect(getByTestId('route-polyline')).toBeTruthy();
    });

    const windowHeight = ReactNative.Dimensions.get('window').height;
    const expectedBottomPadding = Math.round(windowHeight * 0.52 + 24);

    const fitCall = mockFitToCoordinates.mock.calls.at(-1);
    expect(fitCall?.[1]?.edgePadding?.bottom).toBe(expectedBottomPadding);
  });

  test('renders all polygons with markers and labels', async () => {
    const { getAllByTestId } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    await waitFor(() => {
      const markers = getAllByTestId('map-label');
      expect(markers.length).toBe(mockBuildings.reduce((sum, b) => sum + b.polygons.length, 0));
    });

    expect(getAllByTestId('map-label')).toBeTruthy();
  });

  test('pressing a polygon selects it and applies styling', async () => {
    const { UNSAFE_getAllByType } = render(
      <MapScreen
        passSelectedBuilding={mockPassSelectedBuilding}
        passUserLocation={mockPassUserLocation}
        passCurrentBuilding={mockPassCurrentBuilding}
        openBottomSheet={mockOpenBottomSheet}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        exitIndoorView={mockExitIndoorView}
      />,
    );

    fireEvent(UNSAFE_getAllByType(Polygon)[1], 'press');

    await waitFor(() => {
      expect(mockPassSelectedBuilding).toHaveBeenCalled();
      expect(mockOpenBottomSheet).toHaveBeenCalled();
    });
  });
});
