/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx
 * to slot inside information into the BottomSheet**/

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import BuildingDetails from './BuildingDetails';
import DirectionDetails from './DirectionDetails';
import type { BuildingShape } from '../types/BuildingShape';
import SearchSheet from './SearchSheet';
export type BottomSliderHandle = {
  open: () => void;
  close: () => void;
};

type ViewType = 'building' | 'directions';

type BottomSheetProps = {
  selectedBuilding: BuildingShape | null;
  mode: 'detail' | 'search';
  revealSearchBar: () => void;
  buildings: {
    id: string;
    name: string;
    address: string;
  };
};

const BottomSlider = forwardRef<BottomSliderHandle, BottomSheetProps>(
  ({ selectedBuilding, mode, revealSearchBar, buildings }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['75%'], []);

    const [activeView, setActiveView] = useState<ViewType>('building');

    const [startBuilding, setStartBuilding] = useState<BuildingShape | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<BuildingShape | null>(null);

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = () => sheetRef.current?.snapToIndex(0); // 33% (use 1 for 66%)

    const showDirections = (building: BuildingShape) => {
      setStartBuilding(building);
      setDestinationBuilding(null); // or keep existing if you want
      setActiveView('directions');
    };

    const handleSheetClose = () => {
      setActiveView('building');
      revealSearchBar();
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

    const renderContent = () => {
      if (mode === 'search') {
        return <SearchSheet buildings={buildings} />;
      }

      if (activeView === 'building') {
        return (
          <BuildingDetails
            selectedBuilding={selectedBuilding}
            onClose={closeSheet}
            onShowDirections={showDirections}
          />
        );
      } else
        return (
          <DirectionDetails
            onClose={closeSheet}
            startBuilding={startBuilding}
            destinationBuilding={destinationBuilding}
            selectMode={selectMode}
            onSelectStart={() => setSelectMode('start')}
            onSelectDestination={() => setSelectMode('destination')}
          />
        );
    };

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={buildingDetailsStyles.sheetBackground}
        handleIndicatorStyle={buildingDetailsStyles.handle}
        enablePanDownToClose={true}
        enableContentPanningGesture={false}
        enableDynamicSizing={false}
        onClose={handleSheetClose}
      >
        <BottomSheetView style={buildingDetailsStyles.container}>{renderContent()}</BottomSheetView>
      </BottomSheet>
    );
  },
);

export default BottomSlider;
