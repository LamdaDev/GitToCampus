import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogBox, useWindowDimensions } from 'react-native';
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
import { useSharedValue } from 'react-native-reanimated';
import { initializeClarityAsync } from './services/clarity';
import { getStoredGoogleCalendarSessionState } from './services/googleCalendarAuth';
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
  const { height: windowHeight } = useWindowDimensions();
  const bottomSheetAnimatedPosition = useSharedValue(windowHeight);

  const [selectedBuilding, setSelectedBuilding] = useState<BuildingShape | null>(null);
  const [userLocation, setUserLocation] = useState<UserCoords | null>(null);
  const [currentBuilding, setCurrentBuilding] = useState<BuildingShape | null>(null);
  const [outdoorRoute, setOutdoorRoute] = useState<OutdoorRouteOverlay | null>(null);
  const bottomSheetRef = useRef<BottomSliderHandle>(null);
  const [sheetMode, setSheetMode] = useState<SheetMode>('detail');

  // used to check if the bottomsheet is open, if it is then hide the 'AppSearchBar'
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    bottomSheetAnimatedPosition.value = windowHeight;
  }, [bottomSheetAnimatedPosition, windowHeight]);

  useEffect(() => {
    void initializeClarityAsync();
  }, []);

  const toggleSearchBarState = useCallback(() => {
    setSheetOpen(false);
  }, []);

  const openBuildingDetails = useCallback(() => {
    setSheetMode('detail');
    setSheetOpen(true);
    bottomSheetRef.current?.open(0);
  }, []);

  const openSearchBuilding = useCallback(() => {
    setSheetMode('search');
    setSheetOpen(true);
    bottomSheetRef.current?.open(1);
  }, []);

  const handleOpenCalendar = useCallback(async () => {
    openSearchBuilding();

    const sessionState = await getStoredGoogleCalendarSessionState();
    if (sessionState.status !== 'connected' || !sessionState.session) {
      return;
    }

    requestAnimationFrame(() => {
      bottomSheetRef.current?.openCalendarEventsSlider();
    });
  }, [openSearchBuilding]);

  const openCalendarFromMap = useCallback(() => {
    handleOpenCalendar().catch((error) => {
      console.warn('Failed to open calendar from map action', error);
    });
  }, [handleOpenCalendar]);

  const handleMapPress = useCallback(() => {
    bottomSheetRef.current?.closeCalendarSlider();
  }, []);

  const exitSearchMode = useCallback(() => {
    setSheetMode('detail');
  }, []);
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <MapScreen
          passSelectedBuilding={setSelectedBuilding}
          passUserLocation={setUserLocation}
          passCurrentBuilding={setCurrentBuilding}
          openBottomSheet={openBuildingDetails}
          onMapPress={handleMapPress}
          onOpenCalendar={openCalendarFromMap}
          externalSelectedBuilding={selectedBuilding}
          outdoorRoute={outdoorRoute}
          bottomSheetAnimatedPosition={bottomSheetAnimatedPosition}
        />

        {sheetOpen ? null : <AppSearchBar openSearch={openSearchBuilding} />}

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
          animatedPosition={bottomSheetAnimatedPosition}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
