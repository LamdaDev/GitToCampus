import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';
import { getCampusBuildingShapes, getBuildingShapeById, findBuildingAt } from '../utils/buildingsRepository';
import type { PolygonRenderItem } from '../types/Map';

export default function MapScreen() {
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const mapRef = useRef<any>(null);

  // Location tracking (request permission + watch position)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }

      //* Simulate being inside LB building - tested with this, since i was off campus
      // if (__DEV__) {
      //   setUserCoords({
      //     latitude: 57.49705,
      //     longitude: -73.578009,
      //   });
      //   return;
      // }


      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 5,
        },
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Auto-select building when user enters a building
  useEffect(() => {
    if (!userCoords) return;

    try {
      const building = findBuildingAt(userCoords);

      if (building) {
        setSelectedBuildingId(building.id);
        setSelectedCampus(building.campus);
      } else {
        // Clear that selection when user is no longer inside a building
        setSelectedBuildingId(null);
      }
    } catch (err) {
      // Don't crash on unexpected geometry errors
      console.warn('Error checking building containment', err);
    }
  }, [userCoords]);

  // Animate camera when campus changes
  useEffect(() => {
    const targetRegion = getCampusRegion(selectedCampus);
    if (mapRef.current?.animateToRegion) {
      mapRef.current.animateToRegion(targetRegion, 1000);
    }
  }, [selectedCampus]);

  // Buildings data
  const sgwBuildings = useMemo(() => getCampusBuildingShapes('SGW'), []);
  const loyolaBuildings = useMemo(() => getCampusBuildingShapes('LOYOLA'), []);

  const polygonItems: PolygonRenderItem[] = useMemo(() => {
    const flatten = (campus: Campus, buildings: ReturnType<typeof getCampusBuildingShapes>) =>
      buildings.flatMap((b) =>
        b.polygons.map((coords, idx) => ({
          key: `${campus}-${b.id}-${idx}`,
          buildingId: b.id,
          campus,
          coordinates: coords,
        })),
      );

    return [...flatten('SGW', sgwBuildings), ...flatten('LOYOLA', loyolaBuildings)];
  }, [sgwBuildings, loyolaBuildings]);

  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return null;
    return getBuildingShapeById(selectedBuildingId) ?? null;
  }, [selectedBuildingId]);

  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={styles.map}
        initialRegion={getCampusRegion('SGW')}
        provider={PROVIDER_GOOGLE}
        showsUserLocation
        showsMyLocationButton
      >
        {polygonItems.map((p) => {
          const theme = POLYGON_THEME[p.campus];
          const isSelected = p.buildingId === selectedBuildingId;

          return (
            <Polygon
              key={p.key}
              coordinates={p.coordinates}
              tappable
              strokeColor={isSelected ? theme.selectedStroke : theme.stroke}
              fillColor={isSelected ? theme.selectedFill : theme.fill}
              strokeWidth={isSelected ? theme.selectedStrokeWidth : theme.strokeWidth}
              onPress={() => {
                setSelectedBuildingId(p.buildingId);
                setSelectedCampus(p.campus);
              }}
            />
          );
        })}

        {userCoords && <Marker coordinate={userCoords} title="You are here" />}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>GitToCampus</Text>
        <Text style={styles.overlayText}>Camera target: {selectedCampus}</Text>

        {selectedBuilding ? (
          <Text style={styles.overlayText}>Selected: {selectedBuilding.name}</Text>
        ) : (
          <Text style={styles.overlayText}>Tap a building</Text>
        )}

        {locationError ? <Text style={styles.overlayText}>{locationError}</Text> : null}
      </View>
    </View>
  );
}
