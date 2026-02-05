import React, { useRef, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider, { BottomSliderHandle } from './components/BottomSheet';
import MapScreen from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';

/**
 * App.tsx is the entry point Expo looks for by default.
 * We keep it lightweight and delegate most UI logic to screens/components.
 *
 * SafeAreaView ensures content doesn't overlap with notches/status bars on iOS.
 *
 * selectedBuildingName is a prop that will be passed down to MapScreen, the value gets updated upon tapping a building from the UI
 */
const App = () => {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingShape | null>(null);
  const bottomSheetRef = useRef<BottomSliderHandle>(null);

  const openBottomSheet = () => bottomSheetRef.current?.open();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen passSelectedBuilding={setSelectedBuilding} 
        openBottomSheet={openBottomSheet}/>
        <BottomSlider selectedBuilding={selectedBuilding}
        ref={bottomSheetRef} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
