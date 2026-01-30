import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';

import { mapScreenStyles as styles } from '../styles/MapScreen.styles';

const INITIAL_REGION: Region = {
  latitude: 45.4973, // near SGW
  longitude: -73.5789,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function MapScreen() {
  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        // NOTE: provider GOOGLE works on Android by default; iOS may require dev build later.
        provider={PROVIDER_GOOGLE}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>GitToCampus</Text>
      </View>
    </View>
  );
}
