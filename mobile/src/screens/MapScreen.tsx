import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, View, Text, Platform } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import type { SharedValue } from 'react-native-reanimated';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';
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
import * as turf from '@turf/turf';

type MapScreenProps = {
  passSelectedBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  passUserLocation: React.Dispatch<React.SetStateAction<UserCoords | null>>;
  passCurrentBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  openBottomSheet: () => void;
  onMapPress?: () => void;
  onOpenCalendar?: () => void;
  externalSelectedBuilding?: BuildingShape | null;
  outdoorRoute?: OutdoorRouteOverlay | null;
  bottomSheetAnimatedPosition?: SharedValue<number>;
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

const watchUserLocation = async (
  onPositionUpdate: (coords: UserCoords) => void,
): Promise<Location.LocationSubscription | null> => {
  if (typeof Location.hasServicesEnabledAsync === 'function') {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (servicesEnabled === false) {
        console.warn(
          'Location services are disabled. Enable Location Services in iOS Settings or Simulator.',
        );
        return null;
      }
    } catch {
      // If service checks fail, continue with permission and watch requests.
    }
  }

  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    if (!canAskAgain) {
      await Linking.openSettings();
    }
    console.warn('Location permission denied');
    return null;
  }

  let subscription: Location.LocationSubscription | null = null;
  try {
    subscription = await Location.watchPositionAsync(LOCATION_OPTIONS, (pos) => {
      onPositionUpdate(toUserCoords(pos));
    });
  } catch (error) {
    console.warn('Unable to start location tracking', error);
  }

  if (typeof Location.getCurrentPositionAsync === 'function') {
    try {
      const initialPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onPositionUpdate(toUserCoords(initialPosition));
    } catch (error) {
      if (typeof Location.getLastKnownPositionAsync === 'function') {
        try {
          const lastKnownPosition = await Location.getLastKnownPositionAsync({
            maxAge: 60 * 60 * 1000,
          });
          if (lastKnownPosition) {
            onPositionUpdate(toUserCoords(lastKnownPosition));
          } else {
            console.warn(getInitialLocationWarningMessage(error), error);
          }
        } catch {
          console.warn(getInitialLocationWarningMessage(error), error);
        }
      } else {
        console.warn(getInitialLocationWarningMessage(error), error);
      }
    }
  }

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

const renderPolygonItem = (
  item: PolygonRenderItem,
  selectedBuildingId: string | null,
  currentBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
) => {
  const theme = POLYGON_THEME[item.campus];
  const isSelected = item.buildingId === selectedBuildingId;
  const isCurrent = item.buildingId === currentBuildingId;
  const center = getPolygonCenter(item.coordinates);

  const strokeColor = isSelected
    ? theme.selectedStroke
    : isCurrent
      ? theme.currentStroke
      : theme.stroke;
  const fillColor = isSelected ? theme.selectedFill : isCurrent ? theme.currentFill : theme.fill;
  const strokeWidth = isSelected
    ? theme.selectedStrokeWidth
    : isCurrent
      ? theme.currentStrokeWidth
      : theme.strokeWidth;

  return (
    <Fragment key={item.key}>
      <Polygon
        key={item.key}
        coordinates={item.coordinates}
        tappable
        strokeColor={strokeColor}
        fillColor={fillColor}
        strokeWidth={strokeWidth}
        onPress={() => onPolygonPress(item)}
      />
      <Marker coordinate={center} tracksViewChanges={true} testID={'map-label'}>
        <View style={[styles.labels, { backgroundColor: theme.labelFill }]}>
          <Text style={styles.labelText}>{item.buildingShortCode}</Text>
        </View>
      </Marker>
    </Fragment>
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

function MapScreen({
  passSelectedBuilding,
  passUserLocation,
  passCurrentBuilding,
  openBottomSheet,
  onMapPress,
  onOpenCalendar,
  externalSelectedBuilding,
  outdoorRoute,
  bottomSheetAnimatedPosition,
}: Readonly<MapScreenProps>) {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  const mapRef = useRef<any>(null);
  const shouldIgnoreNextMapPressRef = useRef(false);
  const polygonPressGuardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUserPositionUpdate = useCallback((coords: UserCoords) => {
    setUserCoords((previousCoords) => {
      if (
        previousCoords &&
        previousCoords.latitude === coords.latitude &&
        previousCoords.longitude === coords.longitude
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
    let subscription: Location.LocationSubscription | null = null;
    let isActive = true;

    const startTracking = async () => {
      const nextSubscription = await initLocationTracking(handleUserPositionUpdate);
      if (!isActive) {
        nextSubscription?.remove();
        return;
      }
      subscription = nextSubscription;
    };

    void startTracking();

    return () => {
      isActive = false;
      subscription?.remove();
      if (polygonPressGuardTimeoutRef.current !== null) {
        clearTimeout(polygonPressGuardTimeoutRef.current);
        polygonPressGuardTimeoutRef.current = null;
      }
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
  }, []);

  const handlePolygonPress = useCallback(
    (item: PolygonRenderItem) => {
      shouldIgnoreNextMapPressRef.current = true;
      if (polygonPressGuardTimeoutRef.current !== null) {
        clearTimeout(polygonPressGuardTimeoutRef.current);
      }
      polygonPressGuardTimeoutRef.current = setTimeout(() => {
        shouldIgnoreNextMapPressRef.current = false;
        polygonPressGuardTimeoutRef.current = null;
      }, POLYGON_PRESS_GUARD_RESET_DELAY_MS);

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
    if (shouldIgnoreNextMapPressRef.current) {
      shouldIgnoreNextMapPressRef.current = false;
      if (polygonPressGuardTimeoutRef.current !== null) {
        clearTimeout(polygonPressGuardTimeoutRef.current);
        polygonPressGuardTimeoutRef.current = null;
      }
      return;
    }

    setSelectedBuildingId(null);
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

  const renderedPolygons = useMemo(
    () =>
      renderPolygonItems(polygonItems, selectedBuildingId, currentBuildingId, handlePolygonPress),
    [currentBuildingId, handlePolygonPress, polygonItems, selectedBuildingId],
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

  return (
    <View style={styles.container}>
      <MapView {...mapProps}>
        {renderedPolygons}
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
      <MapControls
        selectedCampus={selectedCampus}
        onToggleCampus={handleToggleCampus}
        onRecenter={handleRecenter}
        onOpenCalendar={onOpenCalendar}
        bottomSheetAnimatedPosition={bottomSheetAnimatedPosition}
      />
    </View>
  );
}

export default React.memo(MapScreen);
