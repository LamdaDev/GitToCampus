import React from 'react';
import { SafeAreaView } from 'react-native';
import MapScreen from './screens/MapScreen';

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
