import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions, View, Text, Platform } from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';
import { POI_MARKER_THEME } from '../styles/poi';
import {
  getCampusBuildingShapes,
  getBuildingShapeById,
  findBuildingAt,
} from '../utils/buildingsRepository';
import type { BuildingLabelRenderItem, OutdoorRouteOverlay, PolygonRenderItem } from '../types/Map';

import { BuildingShape } from '../types/BuildingShape';
import { centroidOfPolygon } from '../utils/geoJson';
import { decodePolyline } from '../utils/polyline';

import MapControls from '../components/MapControls';
import * as turf from '@turf/turf';
import IndoorMapScreen from './IndoorMapScreen';
import type { OutdoorPoi, PoiCategorySelection, PoiRangeKm } from '../types/Poi';
import { findNearbyOutdoorPois } from '../utils/outdoorPoisRepository';

type MapScreenProps = {
  passSelectedBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  passUserLocation: React.Dispatch<React.SetStateAction<UserCoords | null>>;
  passCurrentBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  passSelectedPoi?: React.Dispatch<React.SetStateAction<OutdoorPoi | null>>;
  openBottomSheet: () => void;
  onMapPress?: () => void;
  onOpenCalendar?: () => void;
  hideAppSearchBar: () => void;
  revealSearchBar: () => void;
  externalSelectedBuilding?: BuildingShape | null;
  outdoorRoute?: OutdoorRouteOverlay | null;
  bottomSheetAnimatedPosition?: SharedValue<number>;
  mapHandle?: React.RefObject<MapScreenHandle | null>;
  exitIndoorView: () => void;
  indoorStartRoomId?: string | null;
  indoorEndRoomId?: string | null;
  indoorPathStepsChange?: (steps: { icon: string; label: string }[]) => void;
  onIndoorFloorNavReady?: (prev: () => void, next: () => void) => void;
  onReopenIndoorNav?: () => void;
  onIndoorRouteChange?: (startId: string | null, endId: string | null) => void;
  indoorTravelMode?: 'walking' | 'disability';
  selectedPoi?: OutdoorPoi | null;
  selectedPoiCategories?: PoiCategorySelection;
  selectedPoiRangeKm?: PoiRangeKm;
};

export type MapScreenHandle = {
  showIndoor: (building: BuildingShape) => void;
  hideIndoor: () => void;
};

export type UserCoords = { latitude: number; longitude: number };

const noopSelectedPoiSetter = () => {};

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 5,
};

const ROUTE_FIT_FALLBACK_PANEL_RATIO = 0.52;
const ROUTE_FIT_EXTRA_BOTTOM_PADDING = 24;
const ROUTE_FIT_HORIZONTAL_PADDING = 70;
const ROUTE_FIT_TOP_PADDING = 110;
const ANDROID_POI_MARKER_REFRESH_MS = 350;

const ROUTE_LINE_COLOR = '#0472f8';
const ROUTE_LINE_WIDTH = 6;
const WALKING_DASH_PATTERN = [12, 8];
const ROUTE_POLYLINE_STROKE_PROPS = { strokeColor: ROUTE_LINE_COLOR } as const;
const POLYGON_PRESS_GUARD_RESET_DELAY_MS = 0;
const DEFAULT_LABEL_ZOOM_THRESHOLD = 0.0066;
const MIN_LABEL_ZOOM_THRESHOLD = 0.0048;
const MAX_LABEL_ZOOM_THRESHOLD = 0.0092;
const LABEL_THRESHOLD_REFERENCE_AREA = 0.00000008;
const LABEL_THRESHOLD_AREA_EXPONENT = 0.18;
const BUILDING_LABEL_ZOOM_OVERRIDES: Record<string, number> = {};
type PolygonPressGuardTimeoutRef = {
  current: ReturnType<typeof setTimeout> | null;
};
type IgnoreMapPressRef = {
  current: boolean;
};

type RoutePolylineSegment = {
  key: string;
  coordinates: { latitude: number; longitude: number }[];
  requiresWalking: boolean;
};

const toRouteSegmentKey = (
  segmentType: 'overview' | 'segment',
  index: number,
  encodedPolyline: string,
  requiresWalking: boolean,
) => {
  const polylineSignature = `${encodedPolyline.slice(0, 12)}-${encodedPolyline.slice(-12)}`;
  return `${segmentType}-${index}-${requiresWalking ? 'walk' : 'solid'}-${polylineSignature}`;
};

const buildRoutePolylineSegments = (
  outdoorRoute: OutdoorRouteOverlay | null | undefined,
): RoutePolylineSegment[] => {
  if (!outdoorRoute) return [];

  if (outdoorRoute.routeSegments && outdoorRoute.routeSegments.length > 0) {
    const segments: RoutePolylineSegment[] = [];
    for (let index = 0; index < outdoorRoute.routeSegments.length; index += 1) {
      const segment = outdoorRoute.routeSegments[index];
      segments.push({
        key: toRouteSegmentKey(
          'segment',
          index,
          segment.encodedPolyline,
          Boolean(segment.requiresWalking),
        ),
        coordinates: decodePolyline(segment.encodedPolyline),
        requiresWalking: Boolean(segment.requiresWalking),
      });
    }
    return segments;
  }

  return [
    {
      key: toRouteSegmentKey(
        'overview',
        0,
        outdoorRoute.encodedPolyline,
        Boolean(outdoorRoute.isWalkingRoute),
      ),
      coordinates: decodePolyline(outdoorRoute.encodedPolyline),
      requiresWalking: Boolean(outdoorRoute.isWalkingRoute),
    },
  ];
};

const renderRoutePolylineElements = (
  routePolylineSegments: RoutePolylineSegment[],
  routePolylineStrokeProps: { strokeColor: string },
) => {
  const polylineElements: React.ReactElement[] = [];

  for (let index = 0; index < routePolylineSegments.length; index += 1) {
    const segment = routePolylineSegments[index];
    if (segment.coordinates.length <= 1) continue;

    polylineElements.push(
      <Polyline
        key={segment.key}
        testID={index === 0 ? 'route-polyline' : `route-polyline-segment-${index}`}
        coordinates={segment.coordinates}
        {...routePolylineStrokeProps}
        lineDashPattern={segment.requiresWalking ? WALKING_DASH_PATTERN : undefined}
        strokeWidth={ROUTE_LINE_WIDTH}
        lineCap={segment.requiresWalking ? 'butt' : 'round'}
        lineJoin="round"
        zIndex={999}
      />,
    );
  }

  return polylineElements;
};

const flattenRouteCoordinates = (routePolylineSegments: RoutePolylineSegment[]) => {
  const routeCoordinates: { latitude: number; longitude: number }[] = [];
  for (const segment of routePolylineSegments) {
    routeCoordinates.push(...segment.coordinates);
  }
  return routeCoordinates;
};

const hasRenderableRoute = (routePolylineSegments: RoutePolylineSegment[]) => {
  for (const segment of routePolylineSegments) {
    if (segment.coordinates.length > 1) return true;
  }
  return false;
};

const toUserCoords = (pos: Location.LocationObject): UserCoords => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
});

const isIosSimulatorInitialFixError = (error: unknown) => {
  if (Platform.OS !== 'ios') return false;
  if (!(error instanceof Error)) return false;
  return error.message.includes('kCLErrorDomain error 0');
};

const getInitialLocationWarningMessage = (error: unknown) => {
  if (isIosSimulatorInitialFixError(error)) {
    return (
      'Unable to fetch initial location fix. On iOS Simulator, set Features > Location ' +
      'to Apple/City Run/Custom Location and retry.'
    );
  }

  return 'Unable to fetch initial location fix';
};

const getRouteFitBottomPadding = (
  windowHeight: number,
  bottomSheetTop: number | null | undefined,
): number => {
  const minVisibleSheetHeight = windowHeight * ROUTE_FIT_FALLBACK_PANEL_RATIO;
  if (typeof bottomSheetTop !== 'number' || !Number.isFinite(bottomSheetTop)) {
    return Math.round(minVisibleSheetHeight + ROUTE_FIT_EXTRA_BOTTOM_PADDING);
  }

  const visibleSheetHeight = Math.max(0, windowHeight - bottomSheetTop);
  return Math.round(
    Math.max(minVisibleSheetHeight, visibleSheetHeight) + ROUTE_FIT_EXTRA_BOTTOM_PADDING,
  );
};

const flattenBuildingsByCampus = (
  campus: Campus,
  buildings: ReturnType<typeof getCampusBuildingShapes>,
): PolygonRenderItem[] => {
  const items: PolygonRenderItem[] = [];

  for (const building of buildings) {
    for (const [idx, coordinates] of building.polygons.entries()) {
      items.push({
        key: `${campus}-${building.id}-${idx}`,
        buildingId: building.id,
        campus,
        coordinates,
      });
    }
  }

  return items;
};

const areLocationServicesEnabled = async (): Promise<boolean> => {
  if (typeof Location.hasServicesEnabledAsync !== 'function') {
    return true;
  }

  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (servicesEnabled) return true;

    console.warn(
      'Location services are disabled. Enable Location Services in iOS Settings or Simulator.',
    );
    return false;
  } catch {
    // If service checks fail, continue with permission and watch requests.
    return true;
  }
};

const requestLocationPermission = async (): Promise<boolean> => {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return true;

  if (!canAskAgain) {
    await Linking.openSettings();
  }
  console.warn('Location permission denied');
  return false;
};

const startLocationSubscription = async (
  onPositionUpdate: (coords: UserCoords) => void,
): Promise<Location.LocationSubscription | null> => {
  try {
    return await Location.watchPositionAsync(LOCATION_OPTIONS, (pos) => {
      onPositionUpdate(toUserCoords(pos));
    });
  } catch (error) {
    console.warn('Unable to start location tracking', error);
    return null;
  }
};

const applyLastKnownLocationFix = async (
  onPositionUpdate: (coords: UserCoords) => void,
  initialError: unknown,
) => {
  if (typeof Location.getLastKnownPositionAsync !== 'function') {
    console.warn(getInitialLocationWarningMessage(initialError), initialError);
    return;
  }

  try {
    const lastKnownPosition = await Location.getLastKnownPositionAsync({
      maxAge: 60 * 60 * 1000,
    });
    if (lastKnownPosition) {
      onPositionUpdate(toUserCoords(lastKnownPosition));
      return;
    }
  } catch {
    // Fall through to a single warning message below.
  }

  console.warn(getInitialLocationWarningMessage(initialError), initialError);
};

const applyInitialLocationFix = async (onPositionUpdate: (coords: UserCoords) => void) => {
  if (typeof Location.getCurrentPositionAsync !== 'function') return;

  try {
    const initialPosition = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    onPositionUpdate(toUserCoords(initialPosition));
  } catch (error) {
    await applyLastKnownLocationFix(onPositionUpdate, error);
  }
};

const watchUserLocation = async (
  onPositionUpdate: (coords: UserCoords) => void,
): Promise<Location.LocationSubscription | null> => {
  const servicesEnabled = await areLocationServicesEnabled();
  if (!servicesEnabled) return null;

  const hasPermission = await requestLocationPermission();
  if (!hasPermission) return null;

  const subscription = await startLocationSubscription(onPositionUpdate);
  await applyInitialLocationFix(onPositionUpdate);
  return subscription;
};

const clampNumber = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const approximatePolygonArea = (coordinates: LatLng[]) => {
  if (coordinates.length < 3) return 0;

  let twiceArea = 0;
  for (let index = 0; index < coordinates.length; index += 1) {
    const current = coordinates[index];
    const next = coordinates[(index + 1) % coordinates.length];
    twiceArea += current.longitude * next.latitude - next.longitude * current.latitude;
  }

  return Math.abs(twiceArea / 2);
};

const getLargestPolygon = (polygons: LatLng[][]) => {
  if (polygons.length === 0) return null;

  let largestPolygon = polygons[0];
  let largestPolygonArea = approximatePolygonArea(polygons[0]);

  for (let index = 1; index < polygons.length; index += 1) {
    const nextPolygon = polygons[index];
    const nextPolygonArea = approximatePolygonArea(nextPolygon);
    if (nextPolygonArea > largestPolygonArea) {
      largestPolygon = nextPolygon;
      largestPolygonArea = nextPolygonArea;
    }
  }

  return largestPolygon;
};

const getClosedTurfRing = (coordinates: LatLng[]) => {
  if (coordinates.length === 0) return [];

  const ring = coordinates.map((coordinate) => [coordinate.longitude, coordinate.latitude]);
  const [firstLongitude, firstLatitude] = ring[0];
  const [lastLongitude, lastLatitude] = ring[ring.length - 1];

  if (firstLongitude !== lastLongitude || firstLatitude !== lastLatitude) {
    ring.push([firstLongitude, firstLatitude]);
  }

  return ring;
};

const getPolygonCenter = (coordinates: LatLng[]) => {
  try {
    const polygon = turf.polygon([getClosedTurfRing(coordinates)]);
    const center = turf.pointOnFeature(polygon);
    return {
      latitude: center.geometry.coordinates[1],
      longitude: center.geometry.coordinates[0],
    };
  } catch {
    return centroidOfPolygon(coordinates) ?? coordinates[0] ?? { latitude: 0, longitude: 0 };
  }
};

const getBuildingCenter = (building: BuildingShape) => {
  const anchorPolygon = getLargestPolygon(building.polygons) ?? building.polygons[0];
  return anchorPolygon ? getPolygonCenter(anchorPolygon) : { latitude: 0, longitude: 0 };
};

const getBuildingLabelZoomThreshold = (building: BuildingShape) => {
  const override = BUILDING_LABEL_ZOOM_OVERRIDES[building.id];
  if (typeof override === 'number') return override;

  const anchorPolygon = getLargestPolygon(building.polygons) ?? building.polygons[0];
  const polygonArea = anchorPolygon ? approximatePolygonArea(anchorPolygon) : 0;

  if (polygonArea <= 0) return DEFAULT_LABEL_ZOOM_THRESHOLD;

  const normalizedAreaScale = Math.pow(
    polygonArea / LABEL_THRESHOLD_REFERENCE_AREA,
    LABEL_THRESHOLD_AREA_EXPONENT,
  );

  return clampNumber(
    DEFAULT_LABEL_ZOOM_THRESHOLD * normalizedAreaScale,
    MIN_LABEL_ZOOM_THRESHOLD,
    MAX_LABEL_ZOOM_THRESHOLD,
  );
};

const flattenBuildingLabelsByCampus = (
  campus: Campus,
  buildings: ReturnType<typeof getCampusBuildingShapes>,
): BuildingLabelRenderItem[] => {
  const items: BuildingLabelRenderItem[] = [];

  for (const building of buildings) {
    const label = building.shortCode?.trim() ?? building.name.trim();
    if (!label) continue;

    items.push({
      key: `${campus}-${building.id}`,
      buildingId: building.id,
      campus,
      label,
      center: getBuildingCenter(building),
      zoomThreshold: getBuildingLabelZoomThreshold(building),
    });
  }

  return items;
};

const getPolygonRenderColors = (
  theme: (typeof POLYGON_THEME)[Campus],
  isSelected: boolean,
  isCurrent: boolean,
) => {
  if (isSelected) {
    return {
      strokeColor: theme.selectedStroke,
      fillColor: theme.selectedFill,
      strokeWidth: theme.selectedStrokeWidth,
    };
  }

  if (isCurrent) {
    return {
      strokeColor: theme.currentStroke,
      fillColor: theme.currentFill,
      strokeWidth: theme.currentStrokeWidth,
    };
  }

  return {
    strokeColor: theme.stroke,
    fillColor: theme.fill,
    strokeWidth: theme.strokeWidth,
  };
};

const PolygonMarker = React.memo(function PolygonMarker({
  center,
  label,
  backgroundColor,
}: {
  center: { latitude: number; longitude: number };
  label: string;
  backgroundColor: string;
}) {
  const [tracksViewChanges, setTracksViewChanges] = React.useState(true);

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setTracksViewChanges(false);
    }, 300);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <Marker
      testID="map-label"
      coordinate={center}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      tappable={false}
    >
      <View style={[styles.labels, { backgroundColor }]}>
        <Text style={styles.labelText}>{label}</Text>
      </View>
    </Marker>
  );
});

const renderPolygonItem = (
  item: PolygonRenderItem,
  selectedBuildingId: string | null,
  currentBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
) => {
  const theme = POLYGON_THEME[item.campus];
  const isSelected = item.buildingId === selectedBuildingId;
  const isCurrent = item.buildingId === currentBuildingId;

  const { strokeColor, fillColor, strokeWidth } = getPolygonRenderColors(
    theme,
    isSelected,
    isCurrent,
  );

  return (
    <Polygon
      key={item.key}
      coordinates={item.coordinates}
      tappable
      strokeColor={strokeColor}
      fillColor={fillColor}
      strokeWidth={strokeWidth}
      onPress={() => onPolygonPress(item)}
    />
  );
};

const renderPolygonItems = (
  polygonItems: PolygonRenderItem[],
  selectedBuildingId: string | null,
  currentBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
) => {
  const elements: React.ReactElement[] = [];
  for (const item of polygonItems) {
    elements.push(renderPolygonItem(item, selectedBuildingId, currentBuildingId, onPolygonPress));
  }
  return elements;
};

const renderBuildingLabelItem = (item: BuildingLabelRenderItem) => {
  const theme = POLYGON_THEME[item.campus];

  return (
    <PolygonMarker
      key={item.key}
      center={item.center}
      label={item.label}
      backgroundColor={theme.labelFill}
    />
  );
};

const renderBuildingLabelItems = (
  buildingLabelItems: BuildingLabelRenderItem[],
  visibleLabelKeys: string[],
) => {
  const visibleLabelKeySet = new Set(visibleLabelKeys);
  const elements: React.ReactElement[] = [];

  for (const item of buildingLabelItems) {
    if (!visibleLabelKeySet.has(item.key)) continue;
    elements.push(renderBuildingLabelItem(item));
  }

  return elements;
};

const isCoordinateInsideRegion = (coordinate: LatLng, region: Region) => {
  const latitudeRadius = Math.abs(region.latitudeDelta) / 2;
  const longitudeRadius = Math.abs(region.longitudeDelta) / 2;

  return (
    coordinate.latitude >= region.latitude - latitudeRadius &&
    coordinate.latitude <= region.latitude + latitudeRadius &&
    coordinate.longitude >= region.longitude - longitudeRadius &&
    coordinate.longitude <= region.longitude + longitudeRadius
  );
};

const getVisibleBuildingLabelKeys = (
  buildingLabelItems: BuildingLabelRenderItem[],
  region: Region,
) => {
  if (!Number.isFinite(region.latitudeDelta) || !Number.isFinite(region.longitudeDelta)) return [];

  const visibleKeys: string[] = [];

  for (const item of buildingLabelItems) {
    if (region.latitudeDelta > item.zoomThreshold) continue;
    if (!isCoordinateInsideRegion(item.center, region)) continue;
    visibleKeys.push(item.key);
  }

  return visibleKeys;
};

const areStringArraysEqual = (left: string[], right: string[]) => {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }

  return true;
};

const renderPoiMarker = (
  poi: OutdoorPoi,
  selectedPoiId: string | null,
  tracksViewChanges: boolean,
  onPoiPress: (poi: OutdoorPoi) => void,
) => {
  const markerTheme = POI_MARKER_THEME[poi.category];
  const isSelected = poi.id === selectedPoiId;

  return (
    <Marker
      key={poi.id}
      testID={`poi-marker-${poi.id}`}
      coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
      title={poi.name}
      description={poi.address}
      onPress={() => onPoiPress(poi)}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={[
          styles.poiMarker,
          { backgroundColor: isSelected ? markerTheme.selectedColor : markerTheme.color },
          isSelected && styles.poiMarkerSelected,
        ]}
      >
        <Ionicons name={markerTheme.iconName} size={18} color="#fff" />
      </View>
    </Marker>
  );
};
const selectBuildingAtCoords = (
  coords: UserCoords,
  setCurrentBuildingId: (id: string | null) => void,
  setSelectedCampus: (campus: Campus) => void,
) => {
  try {
    const building = findBuildingAt(coords);
    setCurrentBuildingId(building?.id ?? null);
    if (building) setSelectedCampus(building.campus);
  } catch (err) {
    console.warn('Error checking building containment', err);
  }
};

const initLocationTracking = async (
  onPositionUpdate: (coords: UserCoords) => void,
): Promise<Location.LocationSubscription | null> => {
  return watchUserLocation(onPositionUpdate);
};

type LocationTrackingLifecycle = {
  isActive: boolean;
  subscription: Location.LocationSubscription | null;
};

const startLocationTrackingForLifecycle = async (
  onPositionUpdate: (coords: UserCoords) => void,
  lifecycle: LocationTrackingLifecycle,
) => {
  const nextSubscription = await initLocationTracking(onPositionUpdate);
  if (!lifecycle.isActive) {
    nextSubscription?.remove();
    return;
  }

  lifecycle.subscription = nextSubscription;
};

const clearPolygonPressGuardTimeout = (
  polygonPressGuardTimeoutRef: PolygonPressGuardTimeoutRef,
) => {
  if (polygonPressGuardTimeoutRef.current === null) return;
  clearTimeout(polygonPressGuardTimeoutRef.current);
  polygonPressGuardTimeoutRef.current = null;
};

const resetPolygonPressGuard = (
  shouldIgnoreNextMapPressRef: IgnoreMapPressRef,
  polygonPressGuardTimeoutRef: PolygonPressGuardTimeoutRef,
) => {
  shouldIgnoreNextMapPressRef.current = false;
  polygonPressGuardTimeoutRef.current = null;
};

const armPolygonPressGuard = (
  shouldIgnoreNextMapPressRef: IgnoreMapPressRef,
  polygonPressGuardTimeoutRef: PolygonPressGuardTimeoutRef,
) => {
  shouldIgnoreNextMapPressRef.current = true;
  clearPolygonPressGuardTimeout(polygonPressGuardTimeoutRef);
  polygonPressGuardTimeoutRef.current = setTimeout(
    resetPolygonPressGuard,
    POLYGON_PRESS_GUARD_RESET_DELAY_MS,
    shouldIgnoreNextMapPressRef,
    polygonPressGuardTimeoutRef,
  );
};

const consumePolygonPressGuard = (
  shouldIgnoreNextMapPressRef: IgnoreMapPressRef,
  polygonPressGuardTimeoutRef: PolygonPressGuardTimeoutRef,
): boolean => {
  if (!shouldIgnoreNextMapPressRef.current) return false;

  shouldIgnoreNextMapPressRef.current = false;
  clearPolygonPressGuardTimeout(polygonPressGuardTimeoutRef);
  return true;
};

function MapScreen({
  passSelectedBuilding,
  passUserLocation,
  passCurrentBuilding,
  passSelectedPoi = noopSelectedPoiSetter,
  openBottomSheet,
  onMapPress,
  onOpenCalendar,
  hideAppSearchBar,
  revealSearchBar,
  externalSelectedBuilding,
  outdoorRoute,
  bottomSheetAnimatedPosition,
  mapHandle,
  exitIndoorView,
  indoorStartRoomId,
  indoorEndRoomId,
  indoorPathStepsChange,
  onIndoorFloorNavReady,
  onIndoorRouteChange,
  indoorTravelMode,
  selectedPoi = null,
  selectedPoiCategories = [],
  selectedPoiRangeKm = 3,
}: Readonly<MapScreenProps>) {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [poiMarkersTrackViewChanges, setPoiMarkersTrackViewChanges] = useState(
    Platform.OS === 'android',
  );
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  const mapRef = useRef<any>(null);
  const shouldIgnoreNextMapPressRef = useRef(false);
  const polygonPressGuardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUserPositionUpdate = useCallback((coords: UserCoords) => {
    setUserCoords((previousCoords) => {
      if (
        previousCoords?.latitude === coords.latitude &&
        previousCoords?.longitude === coords.longitude
      ) {
        return previousCoords;
      }
      return coords;
    });
  }, []);

  // Pass user location to parent
  useEffect(() => {
    passUserLocation(userCoords);
  }, [userCoords, passUserLocation]);

  // Pass current building to parent
  useEffect(() => {
    const building = currentBuildingId ? getBuildingShapeById(currentBuildingId) : null;
    passCurrentBuilding(building ?? null);
  }, [currentBuildingId, passCurrentBuilding]);

  useEffect(() => {
    const lifecycle: LocationTrackingLifecycle = {
      isActive: true,
      subscription: null,
    };
    void startLocationTrackingForLifecycle(handleUserPositionUpdate, lifecycle);

    return () => {
      lifecycle.isActive = false;
      lifecycle.subscription?.remove();
      clearPolygonPressGuardTimeout(polygonPressGuardTimeoutRef);
    };
  }, [handleUserPositionUpdate]);

  useEffect(() => {
    if (!userCoords) return;
    selectBuildingAtCoords(userCoords, setCurrentBuildingId, setSelectedCampus);
  }, [userCoords]);

  useEffect(() => {
    setSelectedPoiId(selectedPoi?.id ?? null);
  }, [selectedPoi]);

  useEffect(() => {
    const targetRegion = getCampusRegion(selectedCampus);
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(targetRegion, 1000);
    }
  }, [selectedCampus]);

  useEffect(() => {
    if (!externalSelectedBuilding) {
      setSelectedBuildingId(null);
      return;
    }
    passSelectedPoi(null);
    setSelectedPoiId(null);
    setSelectedBuildingId(externalSelectedBuilding.id);
    setSelectedCampus(externalSelectedBuilding.campus);
  }, [externalSelectedBuilding, passSelectedPoi]);

  const sgwBuildings = useMemo(() => getCampusBuildingShapes('SGW'), []);
  const loyolaBuildings = useMemo(() => getCampusBuildingShapes('LOYOLA'), []);

  const polygonItems: PolygonRenderItem[] = useMemo(
    () => [
      ...flattenBuildingsByCampus('SGW', sgwBuildings),
      ...flattenBuildingsByCampus('LOYOLA', loyolaBuildings),
    ],
    [sgwBuildings, loyolaBuildings],
  );
  const buildingLabelItems: BuildingLabelRenderItem[] = useMemo(
    () => [
      ...flattenBuildingLabelsByCampus('SGW', sgwBuildings),
      ...flattenBuildingLabelsByCampus('LOYOLA', loyolaBuildings),
    ],
    [sgwBuildings, loyolaBuildings],
  );
  const [visibleBuildingLabelKeys, setVisibleBuildingLabelKeys] = useState<string[]>([]);

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return getBuildingShapeById(selectedBuildingId) ?? null;
  }, [selectedBuildingId]);

  const handleToggleCampus = useCallback(() => {
    setSelectedCampus((prev) => (prev === 'SGW' ? 'LOYOLA' : 'SGW'));
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    passSelectedPoi(null);
  }, [passSelectedPoi]);

  const handlePolygonPress = useCallback(
    (item: PolygonRenderItem) => {
      armPolygonPressGuard(shouldIgnoreNextMapPressRef, polygonPressGuardTimeoutRef);

      passSelectedPoi(null);
      setSelectedPoiId(null);
      setSelectedBuildingId(item.buildingId);
      setSelectedCampus(item.campus);

      const building = getBuildingShapeById(item.buildingId);
      passSelectedBuilding(building ?? null);
      openBottomSheet();
    },
    [openBottomSheet, passSelectedBuilding, passSelectedPoi],
  );

  const selectedMarkerCoordinate = useMemo(() => {
    if (!selectedBuilding) return null;
    return getBuildingCenter(selectedBuilding);
  }, [selectedBuilding]);

  const handleRecenter = useCallback(() => {
    if (!mapRef.current || !userCoords) return;

    mapRef.current.animateToRegion(
      {
        latitude: userCoords.latitude,
        longitude: userCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      1000,
    );
  }, [userCoords]);

  const handleMapPress = useCallback(() => {
    if (consumePolygonPressGuard(shouldIgnoreNextMapPressRef, polygonPressGuardTimeoutRef)) return;

    setSelectedBuildingId(null);
    setSelectedPoiId(null);
    passSelectedBuilding(null);
    passSelectedPoi(null);
    onMapPress?.();
  }, [onMapPress, passSelectedBuilding, passSelectedPoi]);

  const mapInitialRegion = useMemo(() => getCampusRegion('SGW'), []);

  const showSelectedMarker = Boolean(
    selectedBuildingId && selectedBuilding && selectedMarkerCoordinate,
  );
  const routePolylineSegments = useMemo(
    () => buildRoutePolylineSegments(outdoorRoute),
    [outdoorRoute],
  );
  const routeCoordinates = useMemo(
    () => flattenRouteCoordinates(routePolylineSegments),
    [routePolylineSegments],
  );
  const showRoute = useMemo(
    () => hasRenderableRoute(routePolylineSegments),
    [routePolylineSegments],
  );
  const renderedRoutePolylines = useMemo(
    () => renderRoutePolylineElements(routePolylineSegments, ROUTE_POLYLINE_STROKE_PROPS),
    [routePolylineSegments],
  );

  useEffect(() => {
    if (!showRoute) return;
    if (!mapRef.current?.fitToCoordinates) return;
    const bottomSheetTop = bottomSheetAnimatedPosition?.value ?? null;
    const routeFitEdgePadding = {
      top: ROUTE_FIT_TOP_PADDING,
      right: ROUTE_FIT_HORIZONTAL_PADDING,
      bottom: getRouteFitBottomPadding(windowHeight, bottomSheetTop),
      left: ROUTE_FIT_HORIZONTAL_PADDING,
    };

    mapRef.current.fitToCoordinates(routeCoordinates, {
      edgePadding: routeFitEdgePadding,
      animated: true,
    });
  }, [bottomSheetAnimatedPosition, routeCoordinates, showRoute, windowHeight]);

  const selectedMarker = showSelectedMarker ? (
    <Marker
      coordinate={selectedMarkerCoordinate!}
      title={selectedBuilding?.name}
      tracksViewChanges={false}
    />
  ) : null;

  const handleRegionChange = useCallback(
    (region: Region) => {
      setVisibleBuildingLabelKeys((previousVisibleKeys) => {
        const nextVisibleKeys = getVisibleBuildingLabelKeys(buildingLabelItems, region);
        return areStringArraysEqual(previousVisibleKeys, nextVisibleKeys)
          ? previousVisibleKeys
          : nextVisibleKeys;
      });
    },
    [buildingLabelItems],
  );

  const renderedPolygons = useMemo(
    () =>
      renderPolygonItems(polygonItems, selectedBuildingId, currentBuildingId, handlePolygonPress),
    [currentBuildingId, handlePolygonPress, polygonItems, selectedBuildingId],
  );
  const renderedBuildingLabels = useMemo(
    () => renderBuildingLabelItems(buildingLabelItems, visibleBuildingLabelKeys),
    [buildingLabelItems, visibleBuildingLabelKeys],
  );
  const visiblePois = useMemo(() => {
    if (selectedPoiCategories.length === 0) return [];

    const uniquePois = new Map<string, OutdoorPoi>();
    selectedPoiCategories.forEach((category) => {
      findNearbyOutdoorPois(selectedCampus, category, selectedPoiRangeKm).forEach((entry) => {
        uniquePois.set(entry.poi.id, entry.poi);
      });
    });

    return Array.from(uniquePois.values());
  }, [selectedCampus, selectedPoiCategories, selectedPoiRangeKm]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    setPoiMarkersTrackViewChanges(true);
    const timeoutId = setTimeout(() => {
      setPoiMarkersTrackViewChanges(false);
    }, ANDROID_POI_MARKER_REFRESH_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedPoiCategories, selectedPoiId, selectedPoiRangeKm, visiblePois]);

  const handlePoiPress = useCallback(
    (poi: OutdoorPoi) => {
      armPolygonPressGuard(shouldIgnoreNextMapPressRef, polygonPressGuardTimeoutRef);
      passSelectedPoi(poi);
      setSelectedPoiId(poi.id);
      setSelectedBuildingId(null);
      passSelectedBuilding(null);
      openBottomSheet();
    },
    [openBottomSheet, passSelectedBuilding, passSelectedPoi],
  );
  const renderedPoiMarkers = useMemo(
    () =>
      visiblePois.map((poi) =>
        renderPoiMarker(poi, selectedPoiId, poiMarkersTrackViewChanges, handlePoiPress),
      ),
    [handlePoiPress, poiMarkersTrackViewChanges, selectedPoiId, visiblePois],
  );

  const mapProps = {
    ref: mapRef,
    testID: 'campus-map',
    style: styles.map,
    initialRegion: mapInitialRegion,
    provider: PROVIDER_GOOGLE,
    showsUserLocation: true,
    showsMyLocationButton: false,
    onPress: handleMapPress,
  } as const;

  const [indoorBuilding, setIndoorBuilding] = useState<BuildingShape | null>(null);

  useImperativeHandle(mapHandle, () => ({
    showIndoor: (building: BuildingShape) => setIndoorBuilding(building),
    hideIndoor: () => setIndoorBuilding(null),
  }));

  const resetIndoorBuilding = () => {
    setIndoorBuilding(null);
    exitIndoorView();
  };
  return (
    <View style={styles.container}>
      <MapView
        {...mapProps}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onRegionChangeComplete={handleRegionChange}
      >
        {renderedPolygons}
        {renderedBuildingLabels}
        {renderedPoiMarkers}
        {selectedMarker}
        {showRoute && (
          <>
            {renderedRoutePolylines}
            <Marker
              testID="route-start-marker"
              coordinate={outdoorRoute!.start}
              title="Route start"
              pinColor="green"
            />
            <Marker
              testID="route-end-marker"
              coordinate={outdoorRoute!.destination}
              title="Route destination"
              pinColor="red"
            />
          </>
        )}
      </MapView>

      {indoorBuilding ? (
        <IndoorMapScreen
          onExitIndoor={() => resetIndoorBuilding()}
          onOpenCalendar={onOpenCalendar}
          building={indoorBuilding}
          hideAppSearchBar={hideAppSearchBar}
          revealSearchBar={revealSearchBar}
          externalStartRoomId={indoorStartRoomId}
          externalEndRoomId={indoorEndRoomId}
          onPathStepsChange={indoorPathStepsChange}
          onFloorNavReady={onIndoorFloorNavReady}
          onIndoorRouteChange={onIndoorRouteChange}
          indoorTravelMode={indoorTravelMode}
        />
      ) : (
        <MapControls
          selectedCampus={selectedCampus}
          onToggleCampus={handleToggleCampus}
          onRecenter={handleRecenter}
          onOpenCalendar={onOpenCalendar}
          bottomSheetAnimatedPosition={bottomSheetAnimatedPosition}
        />
      )}
    </View>
  );
}

export default React.memo(MapScreen);
