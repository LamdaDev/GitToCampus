import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogBox, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSlider, { BottomSliderHandle } from './components/BottomSheet';
import MapScreen, { MapScreenHandle, UserCoords } from './screens/MapScreen';
import { BuildingShape } from './types/BuildingShape';
import { useFonts } from 'expo-font';
import AppSearchBar from './components/AppSearchBar';
import { getAllBuildingShapes } from './utils/buildingsRepository';
import { SheetMode } from './types/SheetMode';
import type { OutdoorRouteOverlay } from './types/Map';
import { useSharedValue } from 'react-native-reanimated';
import { initializeClarityAsync } from './services/clarity';
import { getStoredGoogleCalendarSessionState } from './services/googleCalendarAuth';
import type { OutdoorPoi, PoiCategorySelection, PoiRangeKm } from './types/Poi';
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
  const [selectedPoiCategories, setSelectedPoiCategories] = useState<PoiCategorySelection>([]);
  const [selectedPoiRangeKm, setSelectedPoiRangeKm] = useState<PoiRangeKm>(3);
  const [selectedPoi, setSelectedPoi] = useState<OutdoorPoi | null>(null);
  const [indoorStartRoomId, setIndoorStartRoomId] = useState<string | null>(null);
  const [indoorEndRoomId, setIndoorEndRoomId] = useState<string | null>(null);
  const [indoorPathSteps, setIndoorPathSteps] = useState<{ icon: string; label: string }[]>([]);
  const prevFloorRef = useRef<() => void>(() => {});
  const nextFloorRef = useRef<() => void>(() => {});
  const [indoorTravelMode, setIndoorTravelMode] = useState<'walking' | 'disability'>('walking');

  // used to check if the bottomsheet is open, if it is then hide the 'AppSearchBar'
  const [sheetOpen, setSheetOpen] = useState(false);
  const mapRef = useRef<MapScreenHandle>(null);
  const [isIndoor, setIsIndoor] = useState(false);

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
    setSheetOpen(true);

    if (isIndoor) {
      bottomSheetRef.current?.openIndoorDirections();
    } else {
      setSheetMode('search');
      bottomSheetRef.current?.open(1);
    }
  }, [isIndoor]);

  const openCalendarSheet = useCallback(() => {
    setSheetMode('search');
    setSheetOpen(true);
    bottomSheetRef.current?.open(1);
  }, []);

  const handleOpenCalendar = useCallback(async () => {
    openCalendarSheet();

    const sessionState = await getStoredGoogleCalendarSessionState();
    if (sessionState.status !== 'connected' || !sessionState.session) {
      return;
    }

    requestAnimationFrame(() => {
      bottomSheetRef.current?.openCalendarEventsSlider();
    });
  }, [openCalendarSheet]);

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

  const handleShowIndoor = useCallback((building: BuildingShape) => {
    mapRef.current?.showIndoor(building);
  }, []);

  const hideSearchBar = useCallback(() => {
    setSheetOpen(true);
  }, []);

  const handleIndoorFloorNavReady = useCallback((prev: () => void, next: () => void) => {
    prevFloorRef.current = prev;
    nextFloorRef.current = next;
  }, []);

  const handleIndoorRouteChange = useCallback((startId: string | null, endId: string | null) => {
    setIndoorStartRoomId(startId);
    setIndoorEndRoomId(endId);
  }, []);

  const toggleIndoorView = useCallback(() => {
    setSheetOpen(false);
    setIsIndoor(true);
  }, []);

  const handleExitIndoorView = useCallback(() => {
    bottomSheetRef.current?.close();
    setSheetMode('detail');
    setSheetOpen(false);
    setIsIndoor(false);
  }, []);

  const handleShowOutdoorMap = useCallback(() => {
    mapRef.current?.hideIndoor();
    setIsIndoor(false);
  }, []);

  const handlePrevPathFloor = useCallback(() => {
    prevFloorRef.current?.();
  }, []);

  const handleNextPathFloor = useCallback(() => {
    nextFloorRef.current?.();
  }, []);

  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['left', 'right']}>
        <MapScreen
          passSelectedBuilding={setSelectedBuilding}
          passUserLocation={setUserLocation}
          passCurrentBuilding={setCurrentBuilding}
          passSelectedPoi={setSelectedPoi}
          openBottomSheet={openBuildingDetails}
          onMapPress={handleMapPress}
          onOpenCalendar={openCalendarFromMap}
          externalSelectedBuilding={selectedBuilding}
          outdoorRoute={outdoorRoute}
          bottomSheetAnimatedPosition={bottomSheetAnimatedPosition}
          mapHandle={mapRef}
          hideAppSearchBar={hideSearchBar}
          revealSearchBar={toggleSearchBarState}
          exitIndoorView={handleExitIndoorView}
          indoorStartRoomId={indoorStartRoomId}
          indoorEndRoomId={indoorEndRoomId}
          indoorPathStepsChange={setIndoorPathSteps}
          onIndoorFloorNavReady={handleIndoorFloorNavReady}
          indoorTravelMode={indoorTravelMode}
          selectedPoiCategories={selectedPoiCategories}
          selectedPoiRangeKm={selectedPoiRangeKm}
          selectedPoi={selectedPoi}
          onAutoIndoorEntry={toggleIndoorView}
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
          onEnterBuilding={handleShowIndoor}
          isIndoor={isIndoor}
          enterIndoorView={toggleIndoorView}
          indoorPathSteps={indoorPathSteps}
          onPrevPathFloor={handlePrevPathFloor}
          onNextPathFloor={handleNextPathFloor}
          onIndoorRouteChange={handleIndoorRouteChange}
          onIndoorTravelModeChange={setIndoorTravelMode}
          onShowOutdoorMap={handleShowOutdoorMap}
          selectedPoi={selectedPoi}
          selectedPoiCategories={selectedPoiCategories}
          onPoiCategoryChange={setSelectedPoiCategories}
          selectedPoiRangeKm={selectedPoiRangeKm}
          onPoiRangeChange={setSelectedPoiRangeKm}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default App;
