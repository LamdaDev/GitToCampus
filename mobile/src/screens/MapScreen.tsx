import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import styles, { POLYGON_THEME } from '../styles/MapScreen.styles';

// Adjust this import path based on where you placed it
import { getCampusBuildingShapes, getBuildingShapeById } from '../utils/buildingsRepository';
import type { PolygonRenderItem } from '../types/Map';

export default function MapScreen() {
  // Keep this for US-1.3 camera panning later (even if no UI yet)
  const [selectedCampus, setSelectedCampus] = useState<Campus>('SGW');

  // New for US-1.2 selection
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  // Fetch both campuses (TASK-1.2.3 handles join/filter internally + cache)
  const sgwBuildings = useMemo(() => getCampusBuildingShapes('SGW'), []);
  const loyolaBuildings = useMemo(() => getCampusBuildingShapes('LOYOLA'), []);

  // Flatten polygons for rendering (MultiPolygon support)
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
        style={styles.map}
        initialRegion={getCampusRegion('SGW')}
        // Keep your existing mapRef + animateToRegion logic if you already have it.
        // US-1.3 will add a button to pan between SGW and Loyola.
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
      </MapView>

      {/* Overlay (optional, good for demo/testing) */}
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>GitToCampus</Text>

        {/* selectedCampus kept for future US-1.3 (camera control) */}
        <Text style={styles.overlayText}>Camera target: {selectedCampus}</Text>

        {selectedBuilding ? (
          <Text style={styles.overlayText}>Selected: {selectedBuilding.name}</Text>
        ) : (
          <Text style={styles.overlayText}>Tap a building</Text>
        )}
      </View>
    </View>
  );
}
