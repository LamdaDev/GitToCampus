/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx
 * to slot inside information into the BottomSheet**/

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import BuildingDetails from './BuildingDetails';
import DirectionDetails from './DirectionDetails';
import type { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';

export type BottomSliderHandle = {
  open: () => void;
  close: () => void;
};

type ViewType = 'building' | 'directions';

type BottomSheetProps = {
  selectedBuilding: BuildingShape | null;
  userLocation: UserCoords | null;
  currentBuilding: BuildingShape | null;
};

const BottomSlider = forwardRef<BottomSliderHandle, BottomSheetProps>(
  ({ selectedBuilding, userLocation, currentBuilding }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = ['33%', '66%'];

    const [activeView, setActiveView] = useState<ViewType>('building');

    const [startBuilding, setStartBuilding] = useState<BuildingShape | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<BuildingShape | null>(null);

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = () => sheetRef.current?.snapToIndex(0); // 33% (use 1 for 66%)

    const showDirections = (building: BuildingShape, asDestination?: boolean) => {
      if (asDestination) {
        // Walking figure: building is destination, start is current location
        setStartBuilding(null);
        setDestinationBuilding(building);
      } else {
        // "Set as starting point" button: building is start
        setStartBuilding(building);
        setDestinationBuilding(null);
      }
      setActiveView('directions');
    };

    const handleSheetClose = () => {
      setActiveView('building');
    };

    useEffect(() => {
      if (activeView !== 'directions') return;
      if (!selectedBuilding) return;
      if (selectedBuilding.id === startBuilding?.id) return;

      setDestinationBuilding(selectedBuilding);
    }, [selectedBuilding, activeView]);

    useImperativeHandle(ref, () => ({
      open: openSheet,
      close: closeSheet,
    }));

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={buildingDetailsStyles.sheetBackground}
        handleIndicatorStyle={buildingDetailsStyles.handle}
        enablePanDownToClose={true}
        onClose={handleSheetClose}
      >
        <BottomSheetView style={buildingDetailsStyles.container}>
          {activeView === 'building' && (
            <BuildingDetails
              selectedBuilding={selectedBuilding}
              onClose={closeSheet}
              onShowDirections={showDirections}
              currentBuilding={currentBuilding}
              userLocation={userLocation}
            />
          )}
          {activeView === 'directions' && (
            <DirectionDetails
              onClose={closeSheet}
              startBuilding={startBuilding}
              destinationBuilding={destinationBuilding}
              userLocation={userLocation}
              currentBuilding={currentBuilding}
            />
          )}
        </BottomSheetView>
        {/**TO DO: Add in GoogleCalendar Bottom sheet view */}
      </BottomSheet>
    );
  },
);

export default BottomSlider;
