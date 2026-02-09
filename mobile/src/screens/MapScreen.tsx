import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';
import {
  getCampusBuildingShapes,
  getBuildingShapeById,
  findBuildingAt,
} from '../utils/buildingsRepository';
import type { PolygonRenderItem } from '../types/Map';

import { BuildingShape } from '../types/BuildingShape';
import { centroidOfPolygon } from '../utils/geoJson';

// Importing MapControls
import MapControls from '../components/MapControls';

//passSelectedBuilding is a state setter passed from the parent to retrieve selected building object
type MapScreenProps = {
  passSelectedBuilding: React.Dispatch<React.SetStateAction<BuildingShape | null>>;
  openBottomSheet: () => void;
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

export default function MapScreen({ passSelectedBuilding, openBottomSheet }: MapScreenProps) {
  // Keep this for US-1.3 camera panning later (even if no UI yet)
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );

  const mapRef = useRef<any>(null);

  // Location tracking (request permission + watch position)
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission denied');
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

  // For the toggle button:
  const handleToggleCampus = () => {
    setSelectedCampus((prev) => (prev === 'SGW' ? 'LOYOLA' : 'SGW'));
    setSelectedBuildingId(null);
  };

  const handlePolygonPress = (item: PolygonRenderItem) => {
    setSelectedBuildingId(item.buildingId);
    setSelectedCampus(item.campus);

    const building = getBuildingShapeById(item.buildingId);
    passSelectedBuilding(building ?? null);
    openBottomSheet();
  };

  // For the recenter button:
  const handleRecenter = () => {
    if (mapRef.current && userCoords) {
      mapRef.current.animateToRegion(
        {
          latitude: userCoords.latitude,
          longitude: userCoords.longitude,
          latitudeDelta: 0.01, // Zoom level (adjust if needed)
          longitudeDelta: 0.01,
        },
        1000,
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={styles.map}
        initialRegion={getCampusRegion('SGW')}
        provider={PROVIDER_GOOGLE}
        showsUserLocation={true} // Disable/enable user location marker
        showsMyLocationButton={false} // False bacause we have our own recenter button, we dont need google maps'
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
              onPress={() => handlePolygonPress(p)}
            />
          );
        })}

        {selectedBuildingId &&
          selectedBuilding && ( // Show marker only for selected building
            <Marker
              coordinate={
                centroidOfPolygon(selectedBuilding.polygons[0]) ?? { latitude: 0, longitude: 0 }
              }
              title={selectedBuilding.name}
            />
          )}
      </MapView>

      {/* to put the toggle and recenter buttons together in a single pill-shaped control */}
      <MapControls
        selectedCampus={selectedCampus}
        onToggleCampus={handleToggleCampus}
        onRecenter={handleRecenter}
      />
    </View>
  );
}
