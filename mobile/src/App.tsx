import React, { useMemo, useRef, useState } from 'react';
import { LogBox } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider, { BottomSliderHandle } from './components/BottomSheet';
import MapScreen, { UserCoords } from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';
import { useFonts } from 'expo-font';
import AppSearchBar from './components/AppSearchBar';
import { getAllBuildingShapes } from './utils/buildingsRepository';
import { SheetMode } from './types/SheetMode';
import type { OutdoorRouteOverlay } from './types/Map';
LogBox.ignoreLogs(['A props object containing a "key" prop is being spread into JSX']);
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
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [currentBuilding, setCurrentBuilding] = useState<BuildingShape | null>(null);
  const [outdoorRoute, setOutdoorRoute] = useState<OutdoorRouteOverlay | null>(null);
  const bottomSheetRef = useRef<BottomSliderHandle>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('detail');

  // used to check if the bottomsheet is open, if it is then hide the 'AppSearchBar'
  const [sheetOpen, setSheetOpen] = useState(false);

  const toggleSearchBarState = () => {
    setSheetOpen(false);
  };

  const openBuildingDetails = () => {
    setSheetMode('detail');
    setSheetOpen(true);
    bottomSheetRef.current?.open(0);
  };

  const openSearchBuilding = () => {
    setSheetMode('search');
    setSheetOpen(true);
    bottomSheetRef.current?.open(1);
  };

  const exitSearchMode = () => {
    setSheetMode('detail');
  };
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
          passUserLocation={setUserLocation}
          passCurrentBuilding={setCurrentBuilding}
          openBottomSheet={openBuildingDetails}
          externalSelectedBuilding={selectedBuilding}
          outdoorRoute={outdoorRoute}
        />

        {sheetOpen ? '' : <AppSearchBar openSearch={openSearchBuilding} />}

        <BottomSlider
          userLocation={userLocation}
          currentBuilding={currentBuilding}
          selectedBuilding={selectedBuilding}
          ref={bottomSheetRef}
          mode={sheetMode}
          revealSearchBar={toggleSearchBarState}
          buildings={buildings}
          onExitSearch={exitSearchMode}
          passSelectedBuilding={setSelectedBuilding}
          passOutdoorRoute={setOutdoorRoute}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
