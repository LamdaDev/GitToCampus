import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowDimensions, Platform, View, Text } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
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
const WALKING_DOT_PATTERN = [2, 10];

const toUserCoords = (pos: Location.LocationObject): UserCoords => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
});

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
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('Location permission denied');
    return null;
  }

  return Location.watchPositionAsync(LOCATION_OPTIONS, (pos) => {
    onPositionUpdate(toUserCoords(pos));
  });
};

const getPolygonCenter = (coordinates: { latitude: number; longitude: number }[]) => {
  const polygon = turf.polygon([coordinates.map((c) => [c.longitude, c.latitude])]);

  const center = turf.pointOnFeature(polygon);

  return {
    latitude: center.geometry.coordinates[1],
    longitude: center.geometry.coordinates[0],
  };
};

const renderPolygonItem = (
  item: PolygonRenderItem,
  highlightedBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
) => {
  const theme = POLYGON_THEME[item.campus];
  const isSelected = item.buildingId === highlightedBuildingId;
  const center = getPolygonCenter(item.coordinates);

  return (
    <Fragment key={item.key}>
      <Polygon
        key={item.key}
        coordinates={item.coordinates}
        tappable
        strokeColor={isSelected ? theme.selectedStroke : theme.stroke}
        fillColor={isSelected ? theme.selectedFill : theme.fill}
        strokeWidth={isSelected ? theme.selectedStrokeWidth : theme.strokeWidth}
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

export default function MapScreen({
  passSelectedBuilding,
  passUserLocation,
  passCurrentBuilding,
  openBottomSheet,
  onMapPress,
  onOpenCalendar,
  externalSelectedBuilding,
  outdoorRoute,
  bottomSheetAnimatedPosition,
}: MapScreenProps) {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();

  const mapRef = useRef<any>(null);

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

    void initLocationTracking(setUserCoords).then((sub) => {
      subscription = sub;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

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
    if (!externalSelectedBuilding) return;
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

  const handleMapRef = useCallback((ref: any) => {
    mapRef.current = ref;
  }, []);

  const handleMapPress = useCallback(() => {
    // Background map taps clear manual selection and restore current-building highlight.
    setSelectedBuildingId(null);
    passSelectedBuilding(null);
    onMapPress?.();
  }, [onMapPress, passSelectedBuilding]);

  const mapInitialRegion = useMemo(() => getCampusRegion('SGW'), []);

  const showSelectedMarker = Boolean(
    selectedBuildingId && selectedBuilding && selectedMarkerCoordinate,
  );
  const routePolylineStrokeProps = useMemo(
    () =>
      Platform.OS === 'ios'
        ? { strokeColor: ROUTE_LINE_COLOR, strokeColors: [ROUTE_LINE_COLOR] }
        : { strokeColor: ROUTE_LINE_COLOR },
    [],
  );
  const routePolylineSegments = useMemo(() => {
    if (!outdoorRoute) return [];

    if (outdoorRoute.routeSegments && outdoorRoute.routeSegments.length > 0) {
      return outdoorRoute.routeSegments.map((segment, index) => ({
        key: `segment-${index}`,
        coordinates: decodePolyline(segment.encodedPolyline),
        requiresWalking: segment.requiresWalking,
      }));
    }

    return [
      {
        key: 'overview',
        coordinates: decodePolyline(outdoorRoute.encodedPolyline),
        requiresWalking: Boolean(outdoorRoute.isWalkingRoute),
      },
    ];
  }, [outdoorRoute]);
  const routeCoordinates = useMemo(
    () => routePolylineSegments.flatMap((segment) => segment.coordinates),
    [routePolylineSegments],
  );
  const showRoute = routePolylineSegments.some((segment) => segment.coordinates.length > 1);

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
    <Marker coordinate={selectedMarkerCoordinate!} title={selectedBuilding?.name} />
  ) : null;

  // Manual selection has priority; otherwise highlight the building the user is currently inside.
  const highlightedBuildingId = selectedBuildingId ?? currentBuildingId;

  const renderedPolygons = useMemo(() => {
    const elements = [];
    for (const item of polygonItems) {
      elements.push(renderPolygonItem(item, highlightedBuildingId, handlePolygonPress));
    }
    return elements;
  }, [handlePolygonPress, highlightedBuildingId, polygonItems]);

  const mapProps = {
    ref: handleMapRef,
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
            {routePolylineSegments.map((segment, index) =>
              segment.coordinates.length > 1 ? (
                <Polyline
                  key={segment.key}
                  testID={index === 0 ? 'route-polyline' : `route-polyline-segment-${index}`}
                  coordinates={segment.coordinates}
                  {...routePolylineStrokeProps}
                  lineDashPattern={segment.requiresWalking ? WALKING_DOT_PATTERN : undefined}
                  strokeWidth={ROUTE_LINE_WIDTH}
                  lineCap="round"
                  lineJoin="round"
                  zIndex={999}
                />
              ) : null,
            )}
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
