import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

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

type MapScreenProps = {
  passSelectedBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  passUserLocation: React.Dispatch<React.SetStateAction<UserCoords | null>>;
  passCurrentBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  openBottomSheet: () => void;
  externalSelectedBuilding?: BuildingShape | null;
  outdoorRoute?: OutdoorRouteOverlay | null;
};

export type UserCoords = { latitude: number; longitude: number };

const LOCATION_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 5,
};

const ROUTE_FIT_EDGE_PADDING = {
  top: 110,
  right: 70,
  bottom: 220,
  left: 70,
};

const ROUTE_LINE_HALO_COLOR = "rgba(195, 54, 22, 0.9)";
const ROUTE_LINE_COLOR = "#0472f8";
const ROUTE_LINE_HALO_WIDTH = 7;
const ROUTE_LINE_WIDTH = 6;

const toUserCoords = (pos: Location.LocationObject): UserCoords => ({
  latitude: pos.coords.latitude,
  longitude: pos.coords.longitude,
});

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

const renderPolygonItem = (
  item: PolygonRenderItem,
  selectedBuildingId: string | null,
  onPolygonPress: (item: PolygonRenderItem) => void,
) => {
  const theme = POLYGON_THEME[item.campus];
  const isSelected = item.buildingId === selectedBuildingId;

  return (
    <Polygon
      key={item.key}
      coordinates={item.coordinates}
      tappable
      strokeColor={isSelected ? theme.selectedStroke : theme.stroke}
      fillColor={isSelected ? theme.selectedFill : theme.fill}
      strokeWidth={isSelected ? theme.selectedStrokeWidth : theme.strokeWidth}
      onPress={() => onPolygonPress(item)}
    />
  );
};

export default function MapScreen({
  passSelectedBuilding,
  passUserLocation,
  passCurrentBuilding,
  openBottomSheet,
  externalSelectedBuilding,
  outdoorRoute,
}: MapScreenProps) {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [currentBuildingId, setCurrentBuildingId] = useState<string | null>(null);

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

    const initTracking = async () => {
      subscription = await watchUserLocation(setUserCoords);
    };

    void initTracking();

    return () => {
      subscription?.remove();
    };
  }, []);

  useEffect(() => {
    if (!userCoords) return;

    try {
      const building = findBuildingAt(userCoords);

      if (building) {
        setSelectedBuildingId(building.id);
        setCurrentBuildingId(building.id);
        setSelectedCampus(building.campus);
      } else {
        // Clear that selection when user is no longer inside a building
        setSelectedBuildingId(null);
        setCurrentBuildingId(null);
      }
    } catch (err) {
      // Don't crash on unexpected geometry errors
      console.warn('Error checking building containment', err);
    }
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

  const mapInitialRegion = useMemo(() => getCampusRegion('SGW'), []);

  const showSelectedMarker = Boolean(
    selectedBuildingId && selectedBuilding && selectedMarkerCoordinate,
  );
  const routeCoordinates = useMemo(
    () => decodePolyline(outdoorRoute?.encodedPolyline ?? ''),
    [outdoorRoute?.encodedPolyline],
  );
  const showRoute = routeCoordinates.length > 1 && Boolean(outdoorRoute);

  useEffect(() => {
    if (!showRoute) return;
    if (!mapRef.current?.fitToCoordinates) return;

    mapRef.current.fitToCoordinates(routeCoordinates, {
      edgePadding: ROUTE_FIT_EDGE_PADDING,
      animated: true,
    });
  }, [routeCoordinates, showRoute]);

  const selectedMarker = showSelectedMarker ? (
    <Marker coordinate={selectedMarkerCoordinate!} title={selectedBuilding?.name} />
  ) : null;

  const renderedPolygons = useMemo(() => {
    const elements = [];
    for (const item of polygonItems) {
      elements.push(renderPolygonItem(item, selectedBuildingId, handlePolygonPress));
    }
    return elements;
  }, [handlePolygonPress, polygonItems, selectedBuildingId]);

  const mapProps = {
    ref: handleMapRef,
    style: styles.map,
    initialRegion: mapInitialRegion,
    provider: PROVIDER_GOOGLE,
    showsUserLocation: true,
    showsMyLocationButton: false,
  } as const;

  return (
    <View style={styles.container}>
      <MapView {...mapProps}>
        {renderedPolygons}
        {selectedMarker}
        {showRoute && (
          <>
            {/* <Polyline
              coordinates={routeCoordinates}
              strokeColor={ROUTE_LINE_HALO_COLOR}
              strokeWidth={ROUTE_LINE_HALO_WIDTH}
              zIndex={998}
            /> */}
            <Polyline
              testID="route-polyline"
              coordinates={routeCoordinates}
              strokeColors={[ROUTE_LINE_COLOR]}
              strokeWidth={ROUTE_LINE_WIDTH}
              
              lineCap="round"
              lineJoin="round"
              zIndex={999}
            />
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
      />
    </View>
  );
}
