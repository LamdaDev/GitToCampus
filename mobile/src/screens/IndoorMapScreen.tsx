import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import IndoorControls from '../components/indoor/IndoorControls';
import { BuildingShape } from '../types/BuildingShape';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { floorPlans } from '../utils/floorPlans';
import IndoorBottomSheet, { IndoorBottomSheetRef } from '../components/indoor/BuildingListSheet';

type props = {
  onExitIndoor: () => void;
  onOpenCalendar?: () => void;
  hideAppSearchBar: () => void;
  revealSearchBar: () => void;
  building: BuildingShape;
};

export default function IndoorMapScreen({
  onExitIndoor,
  onOpenCalendar,
  hideAppSearchBar,
  revealSearchBar,
  building,
}: Readonly<props>) {
  const bottomSheetRef = useRef<IndoorBottomSheetRef>(null);

  const [isIndoorSheetOpen, setIndoorSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(building);
  const [currentFloor, setCurrentFloor] = useState<string | null>(null);

  // OPEN SHEET
  const openAvailableBuildings = () => {
    bottomSheetRef.current?.open();
    hideAppSearchBar();
    setIndoorSheetOpen(true);
  };

  // CLOSE SHEET
  const handleRevealSearchBar = () => {
    revealSearchBar();
    setIndoorSheetOpen(false);
  };

  // WHEN USER SELECTS BUILDING
  const handleSelectBuilding = (b: BuildingShape) => {
    setSelectedBuilding(b);
    bottomSheetRef.current?.close();
  };

  // FLOOR PLANS BASED ON SELECTED BUILDING
  const indoorFloorPlans = useMemo(() => {
    const code = selectedBuilding?.shortCode;
    if (!code || !(code in floorPlans)) return null;

    return floorPlans[code as keyof typeof floorPlans];
  }, [selectedBuilding?.shortCode]);

  const floorLevels = useMemo(() => {
    return indoorFloorPlans ? Object.keys(indoorFloorPlans) : [];
  }, [indoorFloorPlans]);

  // RESET FLOOR WHEN BUILDING CHANGES
  useEffect(() => {
    if (floorLevels.length > 0) {
      setCurrentFloor(floorLevels[0]);
    }
  }, [floorLevels, selectedBuilding]);

  const handleFloorUp = useCallback(() => {
    setCurrentFloor((prev) => {
      if (prev === null) return prev;

      const index = floorLevels.indexOf(prev);
      if (index === -1) return prev;

      return floorLevels[Math.min(index + 1, floorLevels.length - 1)];
    });
  }, [floorLevels]);

  const handleFloorDown = useCallback(() => {
    setCurrentFloor((prev) => {
      if (prev === null) return prev;

      const index = floorLevels.indexOf(prev);
      if (index === -1) return prev;

      return floorLevels[Math.max(index - 1, 0)];
    });
  }, [floorLevels]);

  const plan =
    indoorFloorPlans && currentFloor !== null
      ? indoorFloorPlans[currentFloor as keyof typeof indoorFloorPlans]
      : null;

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'white' }}>
      {/* CONTROLS */}
      <IndoorControls
        onExitIndoor={onExitIndoor}
        onOpenCalendar={onOpenCalendar}
        onFloorUp={handleFloorUp}
        onFloorDown={handleFloorDown}
        currentFloor={currentFloor}
        openAvailableBuildings={openAvailableBuildings}
        isIndoorSheetOpen={isIndoorSheetOpen}
        building={selectedBuilding}
      />

      {/* MAP */}
      <ReactNativeZoomableView
        maxZoom={10}
        minZoom={0.3}
        zoomStep={0.5}
        initialZoom={1}
        bindToBorders={false}
      >
        {plan?.type === 'svg' && <plan.data width={'100%'} height={'100%'} />}

        {plan?.type === 'png' && (
          <Image
            source={plan.data}
            style={{ width: 1000, height: 1000 }}
            resizeMode="contain"
          />
        )}
      </ReactNativeZoomableView>

      {/* BOTTOM SHEET */}
      <IndoorBottomSheet
        ref={bottomSheetRef}
        reOpenSearchBar={handleRevealSearchBar}
        onPressBuilding={handleSelectBuilding}
      />
    </View>
  );
}