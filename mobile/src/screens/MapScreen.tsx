import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { mapScreenStyles as styles } from '../styles/Mapscreen.styles';

/**
 * INITIAL_REGION sets the initial camera position for the map.
 * For now, we default to SGW (downtown campus) as a simple baseline.
 *
 * latitudeDelta / longitudeDelta control zoom level:
 * - smaller values => more zoomed in
 * - larger values  => more zoomed out
 *
 * Later tasks will introduce campus presets (SGW + Loyola) and switching logic.
 */
const INITIAL_REGION: Region = {
  latitude: 45.4973, // near SGW
  longitude: -73.5789,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function MapScreen() {
  return (
    /**
     * Container is a full-screen wrapper for the map + overlay UI.
     * The MapView itself uses absolute fill so it takes the entire screen.
     */
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        /**
         * provider={PROVIDER_GOOGLE}:
         * - Works reliably on Android (Google Maps is the default provider).
         * - On iOS using Expo Go, Google provider may not work without an Expo Dev Build.
         *   If iOS testing becomes an issue, we can remove this line to fall back to Apple Maps tiles.
         */
        provider={PROVIDER_GOOGLE}
      />

    {/**
       * Overlay UI:
       * This is a simple label rendered above the map so we can quickly confirm
       * that the MapScreen loaded correctly and is rendering UI on top of the map.
       *
       * Later we can extend this overlay to show selected campus, buttons, etc.
       */}
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>GitToCampus</Text>
      </View>
    </View>
  );
}
