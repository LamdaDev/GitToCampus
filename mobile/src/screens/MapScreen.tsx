import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import type { Campus } from '../types/Campus';
import { getCampusRegion } from '../constants/campuses';
import { mapScreenStyles as styles } from '../styles/MapScreen.styles';

/**
 * MapScreen renders the interactive map and provides the foundation for:
 * - displaying SGW/Loyola campus presets
 * - switching campuses via state + camera animation
 * - adding UI controls later
 */
export default function MapScreen() {
  const mapRef = useRef<MapView | null>(null);
  const [selectedCampus, _setSelectedCampus] = useState<Campus>('SGW');

  /**
   * Whenever selectedCampus changes, animate the map camera to the appropriate
   * preset region (SGW or Loyola).
   *
   * This separates UI from behavior:
   * - The "toggle UI" can be implemented later without rewriting map logic.
   * - Any component can change selectedCampus, and the map will react consistently.
   */
  useEffect(() => {
    const targetRegion = getCampusRegion(selectedCampus);

    // Smooth camera transition to new campus region (duration in ms)
    mapRef.current?.animateToRegion(targetRegion, 800);
  }, [selectedCampus]);

  /**
   * DEV-ONLY TEST (optional):
   * If you want to verify that region switching works *without* UI,
   * temporarily uncomment this effect. It will auto-switch from SGW to Loyola
   * after a short delay.
   *
   * IMPORTANT: Keep this commented out for production/merge unless desired.
   */
  //   useEffect(() => {
  //     const timer = setTimeout(() => setSelectedCampus('LOYOLA'), 1500);
  //     return () => clearTimeout(timer);
  //   }, []);

  return (
    <View style={styles.container}>
      <MapView
        /**
         * Store the MapView reference so we can call animateToRegion later.
         * Note: callback ref avoids some typing issues compared to useRef<MapView>(null)
         */
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={StyleSheet.absoluteFillObject}
        /**
         * initialRegion is used only on first render.
         * After that, region switching is handled by animateToRegion in the effect above.
         */
        initialRegion={getCampusRegion(selectedCampus)}
        /**
         * provider={PROVIDER_GOOGLE}:
         * - Works reliably on Android (Google Maps tiles).
         * - On iOS with Expo Go, Google provider may require an Expo Dev Build later.
         *   If iOS testing becomes an issue, remove provider to fall back to Apple Maps tiles.
         */
        provider={PROVIDER_GOOGLE}
      />

      {/* Overlay UI for quick verification (no campus toggle UI yet) */}
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>GitToCampus</Text>
        {/* Shows current campus state so reviewers understand what’s selected */}
        <Text style={{ marginTop: 2, fontSize: 12 }}>Campus: {selectedCampus}</Text>
      </View>
    </View>
  );
}
