import React, {
  Fragment,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useWindowDimensions, View, Text, Platform } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import type { SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';
import { POI_MARKER_THEME } from '../constants/poi';
import {
  getCampusBuildingShapes,
  getBuildingShapeById,
  findBuildingAt,
} from '../utils/buildingsRepository';
import type { OutdoorRouteOverlay, PolygonRenderItem } from '../types/Map';

import { BuildingShape } from '../types/BuildingShape';
import { centroidOfPolygon } from '../utils/geoJson';
import { decodePolyline } from '../utils/polyline';

import MapControls from '../components/MapControls';
import PoiCategoryChips from '../components/PoiCategoryChips';
import PoiRangeChips from '../components/PoiRangeChips';
import * as turf from '@turf/turf';
import IndoorMapScreen from './IndoorMapScreen';
import type { OutdoorPoi, PoiCategory, PoiRangeKm } from '../types/Poi';
import { findNearbyOutdoorPois } from '../utils/outdoorPoisRepository';

type MapScreenProps = {
  passSelectedBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  passUserLocation: React.Dispatch<React.SetStateAction<UserCoords | null>>;
  passCurrentBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
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
};

export type MapScreenHandle = {
  showIndoor: (building: BuildingShape) => void;
  hideIndoor: () => void;
};

export type UserCoords = { latitude: number; longitude: number };

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 5,
};

const ROUTE_FIT_FALLBACK_PANEL_RATIO = 0.52;
const ROUTE_FIT_EXTRA_BOTTOM_PADDING = 24;
const ROUTE_FIT_HORIZONTAL_PADDING = 70;
const ROUTE_FIT_TOP_PADDING = 110;

const ROUTE_LINE_COLOR = '#0472f8';
const ROUTE_LINE_WIDTH = 6;
const WALKING_DASH_PATTERN = [12, 8];
const ROUTE_POLYLINE_STROKE_PROPS = { strokeColor: ROUTE_LINE_COLOR } as const;
const POLYGON_PRESS_GUARD_RESET_DELAY_MS = 0;
//EDIT THIS VALUE TO ADJUST HOW MUCH ZOOM IS REQUIRED TO SHOW BUILDING LABELS
const SHOW_LABEL_ZOOM_THRESHOLD = 0.0086;
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
        buildingShortCode: building.shortCode ?? '',
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

const getPolygonCenter = (coordinates: { latitude: number; longitude: number }[]) => {
  try {
    const polygon = turf.polygon([coordinates.map((c) => [c.longitude, c.latitude])]);
    const center = turf.pointOnFeature(polygon);
    return {
      latitude: center.geometry.coordinates[1],
      longitude: center.geometry.coordinates[0],
    };
  } catch {
    return centroidOfPolygon(coordinates) ?? coordinates[0] ?? { latitude: 0, longitude: 0 };
  }
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
  zoomLevel: number,
) => {
  const theme = POLYGON_THEME[item.campus];
  const isSelected = item.buildingId === selectedBuildingId;
  const isCurrent = item.buildingId === currentBuildingId;

  const center = getPolygonCenter(item.coordinates);

  const { strokeColor, fillColor, strokeWidth } = getPolygonRenderColors(
    theme,
    isSelected,
    isCurrent,
  );

  const showBuildingLabel = zoomLevel < SHOW_LABEL_ZOOM_THRESHOLD;
  return (
    <Fragment key={item.key}>
      <Polygon
        coordinates={item.coordinates}
        tappable
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        onPress={() => onPolygonPress(item)}
      />

      {showBuildingLabel && (
        <PolygonMarker
          center={center}
          label={item.buildingShortCode}
          backgroundColor={theme.labelFill}
        />
      )}
    </Fragment>
  );
};

const renderPolygonItems = (
  polygonItems: PolygonRenderItem[],
  selectedBuildingId: string | null,
  currentBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
  zoomLevel: number,
) => {
  const elements: React.ReactElement[] = [];
  for (const item of polygonItems) {
    elements.push(
      renderPolygonItem(item, selectedBuildingId, currentBuildingId, onPolygonPress, zoomLevel),
    );
  }
  return elements;
};

const renderPoiMarker = (
  poi: OutdoorPoi,
  selectedPoiId: string | null,
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
      tracksViewChanges={false}
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
}: Readonly<MapScreenProps>) {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedPoiCategory, setSelectedPoiCategory] = useState<PoiCategory | null>(null);
  const [selectedPoiRangeKm, setSelectedPoiRangeKm] = useState<PoiRangeKm>(3);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
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
    setSelectedPoiId(null);
    setSelectedBuildingId(externalSelectedBuilding.id);
    setSelectedCampus(externalSelectedBuilding.campus);
  }, [externalSelectedBuilding]);

  const sgwBuildings = useMemo(() => getCampusBuildingShapes('SGW'), []);
  const loyolaBuildings = useMemo(() => getCampusBuildingShapes('LOYOLA'), []);

  const polygonItems: PolygonRenderItem[] = useMemo(
    () => [
      ...flattenBuildingsByCampus('SGW', sgwBuildings),
      ...flattenBuildingsByCampus('LOYOLA', loyolaBuildings),
    ],
    [sgwBuildings, loyolaBuildings],
  );

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return getBuildingShapeById(selectedBuildingId) ?? null;
  }, [selectedBuildingId]);

  const handleToggleCampus = useCallback(() => {
    setSelectedCampus((prev) => (prev === 'SGW' ? 'LOYOLA' : 'SGW'));
    setSelectedBuildingId(null);
    setSelectedPoiId(null);
  }, []);

  const handlePolygonPress = useCallback(
    (item: PolygonRenderItem) => {
      armPolygonPressGuard(shouldIgnoreNextMapPressRef, polygonPressGuardTimeoutRef);

      setSelectedPoiId(null);
      setSelectedBuildingId(item.buildingId);
      setSelectedCampus(item.campus);

      const building = getBuildingShapeById(item.buildingId);
      passSelectedBuilding(building ?? null);
      openBottomSheet();
    },
    [openBottomSheet, passSelectedBuilding],
  );

  const selectedMarkerCoordinate = useMemo(() => {
    if (!selectedBuilding) return null;
    return centroidOfPolygon(selectedBuilding.polygons[0]) ?? { latitude: 0, longitude: 0 };
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
    onMapPress?.();
  }, [onMapPress, passSelectedBuilding]);

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
  const initialRegion = getCampusRegion('SGW');

  const [zoomLevel, setZoomLevel] = useState(initialRegion.latitudeDelta);
  const handleRegionChange = useCallback((region: any) => {
    setZoomLevel(region.latitudeDelta);
  }, []);

  const renderedPolygons = useMemo(
    () =>
      renderPolygonItems(
        polygonItems,
        selectedBuildingId,
        currentBuildingId,
        handlePolygonPress,
        zoomLevel,
      ),
    [currentBuildingId, handlePolygonPress, polygonItems, selectedBuildingId, zoomLevel],
  );
  const visiblePois = useMemo(() => {
    if (!selectedPoiCategory) return [];
    return findNearbyOutdoorPois(selectedCampus, selectedPoiCategory, selectedPoiRangeKm).map(
      (entry) => entry.poi,
    );
  }, [selectedCampus, selectedPoiCategory, selectedPoiRangeKm]);
  const selectedPoi = useMemo(
    () => visiblePois.find((poi) => poi.id === selectedPoiId) ?? null,
    [selectedPoiId, visiblePois],
  );
  const handlePoiPress = useCallback(
    (poi: OutdoorPoi) => {
      setSelectedPoiId(poi.id);
      setSelectedBuildingId(null);
      passSelectedBuilding(null);
    },
    [passSelectedBuilding],
  );
  const renderedPoiMarkers = useMemo(
    () => visiblePois.map((poi) => renderPoiMarker(poi, selectedPoiId, handlePoiPress)),
    [handlePoiPress, selectedPoiId, visiblePois],
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
        <>
          <PoiCategoryChips
            selectedCategory={selectedPoiCategory}
            onSelectCategory={(category) => {
              setSelectedPoiCategory(category);
              setSelectedPoiId(null);
            }}
          />
          {selectedPoiCategory ? (
            <PoiRangeChips
              selectedRangeKm={selectedPoiRangeKm}
              onSelectRangeKm={(rangeKm) => {
                setSelectedPoiRangeKm(rangeKm);
                setSelectedPoiId(null);
              }}
            />
          ) : null}
          {selectedPoi ? (
            <View style={styles.poiInfoCard} testID="poi-info-card">
              <Text style={styles.poiInfoCategory}>{selectedPoi.category.toUpperCase()}</Text>
              <Text style={styles.poiInfoTitle}>{selectedPoi.name}</Text>
              <Text style={styles.poiInfoAddress}>{selectedPoi.address}</Text>
            </View>
          ) : null}
          <MapControls
            selectedCampus={selectedCampus}
            onToggleCampus={handleToggleCampus}
            onRecenter={handleRecenter}
            onOpenCalendar={onOpenCalendar}
            bottomSheetAnimatedPosition={bottomSheetAnimatedPosition}
          />
        </>
      )}
    </View>
  );
}

export default React.memo(MapScreen);
