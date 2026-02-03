import React from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider from "./components/BottomSlider";
import MapScreen from './screens/MapScreen';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen />
        <BottomSlider />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
