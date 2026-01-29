import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';

const INITIAL_REGION: Region = {
  latitude: 45.4973,       // near SGW
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
      {/* Simple overlay label so you know the screen rendered */}
      <View style={styles.overlay}>
        <Text style={styles.overlayText}>GitToCampus</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  overlayText: { fontWeight: '700' },
});
