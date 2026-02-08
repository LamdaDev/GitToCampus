import React, { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider, { BottomSliderHandle } from './components/BottomSheet';
import MapScreen from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';
import { useFonts } from 'expo-font';

/**
 * App.tsx is the entry point Expo looks for by default.
 * We keep it lightweight and delegate most UI logic to screens/components.
 *
 * SafeAreaView ensures content doesn't overlap with notches/status bars on iOS.
 *
 * selectedBuilding is a prop that will be passed down to MapScreen, the value gets updated upon tapping a building from the UI and used to pass into BottomSlider
 * Currently MapScreen seems to be taking some time loading which building is selected. This could be due to the logic constantly iterating through each building name in
 * building_list.json
 */
const App = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingShape | null>(null);
  const bottomSheetRef = useRef<BottomSliderHandle>(null);

  const openBottomSheet = () => bottomSheetRef.current?.open();

  const [fontsLoaded] = useFonts({
    gabarito: require('./assets/fonts/Gabarito-Regular.ttf'),
    'gabarito-bold': require('./assets/fonts/Gabarito-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen passSelectedBuilding={setSelectedBuilding} openBottomSheet={openBottomSheet} />
        <BottomSlider selectedBuilding={selectedBuilding} ref={bottomSheetRef} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
