import React, { useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider, { BottomSliderHandle } from './components/BottomSheet';
import MapScreen from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';
import { useFonts } from 'expo-font';
import AppSearchBar from './components/AppSearchBar';
import { getAllBuildingShapes } from './utils/buildingsRepository';
type SheetMode = 'detail' | 'search';

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
  const [sheetMode, setSheetMode] = useState<SheetMode>('detail');

  // used to check if the bottomsheet is open, if it is then hide the 'AppSearchBar'
  const [sheetOpen, setSheetOpen] = useState(false);
  const openBottomSheet = () => bottomSheetRef.current?.open();

  const toggleSearchBarState = () => {
    setSheetOpen(false);
  };

  const openBuildingDetails = () => {
    setSheetMode('detail');
    setSheetOpen(true);
    openBottomSheet();
  };

  const openSearchBuilding = () => {
    setSheetMode('search');
    setSheetOpen(true);
    openBottomSheet();
  };

  const exitSearchMode =()=>setSheetMode('detail')
  /*load once for the searching for specifc buildings
   * buildings gets passed into bottomSheet then into searchBuilding.tsx
   */

  const buildings = useMemo(() => getAllBuildingShapes(), []);

  const [fontsLoaded] = useFonts({
    gabarito: require('./assets/fonts/Gabarito-Regular.ttf'),
    'gabarito-bold': require('./assets/fonts/Gabarito-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView>
      <SafeAreaView style={{ flex: 1 }}>
        <MapScreen
          passSelectedBuilding={setSelectedBuilding}
          openBottomSheet={openBuildingDetails}
        />

        {sheetOpen ? '' : <AppSearchBar openSearch={openSearchBuilding} />}

        <BottomSlider
          selectedBuilding={selectedBuilding}
          ref={bottomSheetRef}
          mode={sheetMode}
          revealSearchBar={toggleSearchBarState}
          buildings={buildings}
          onExitSearch={exitSearchMode}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
