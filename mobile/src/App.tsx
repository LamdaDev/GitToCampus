import React from 'react';
import { SafeAreaView } from 'react-native';
import MapScreen from './screens/MapScreen';

import { logGeoJsonSummary } from './utils/geoJsonDebug';

// Call the debug function to log GeoJSON summary on app start (comment out or remove in production)
logGeoJsonSummary();

/**
 * App.tsx is the entry point Expo looks for by default.
 * We keep it lightweight and delegate most UI logic to screens/components.
 *
 * SafeAreaView ensures content doesn't overlap with notches/status bars on iOS.
 */
const App = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <MapScreen />
    </SafeAreaView>
  );
};

export default App;
