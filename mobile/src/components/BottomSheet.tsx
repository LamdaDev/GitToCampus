/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx
 * to slot inside information into the BottomSheet**/

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import BuildingDetails from './BuildingDetails';
import DirectionDetails from './DirectionDetails';
import type { BuildingShape } from '../types/BuildingShape';
import SearchSheet from './SearchSheet';
export type BottomSliderHandle = {
  open: (index?: number) => void;
  close: () => void;
};

type ViewType = 'building' | 'directions';

type BottomSheetProps = {
  selectedBuilding: BuildingShape | null;
  mode: 'detail' | 'search';
  revealSearchBar: () => void;
  buildings: BuildingShape[];
  onExitSearch: () => void;
  passSelectedBuilding: (b: BuildingShape | null) => void;
};

const BottomSlider = forwardRef<BottomSliderHandle, BottomSheetProps>(
  (
    { selectedBuilding, mode, revealSearchBar, buildings, onExitSearch, passSelectedBuilding },
    ref,
  ) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['36%', '75%'], []);

    const [activeView, setActiveView] = useState<ViewType>('building');

    const [startBuilding, setStartBuilding] = useState<BuildingShape | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<BuildingShape | null>(null);

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = (index: number = 0) => {
      sheetRef.current?.snapToIndex(index);
    };
  
    const [searchFor, setSearchFor] = useState<'start' | 'destination' | null>(null);

    const showDirections = (building: BuildingShape) => {
      setStartBuilding(building);
      setDestinationBuilding(null); // or keep existing if you want
      setActiveView('directions');
    };

    const handleSheetClose = () => {
      setActiveView('building');
      setSearchFor(null);
      revealSearchBar();
    };

    const closeSearchBuilding=(chosenBuilding:BuildingShape)=>{
      passSelectedBuilding(chosenBuilding);
      //SET START BUILDING SHOULD BE WHERE USER IS CURRENTLY POSITION. (FOR FUTURE USES)
      setStartBuilding(null)
      setDestinationBuilding(chosenBuilding)
      setActiveView('directions')
      onExitSearch()
      sheetRef.current?.snapToIndex(0)
    }

    const handleInternalSearch = (building: BuildingShape) => {
      if (searchFor === 'start') setStartBuilding(building);
      else setDestinationBuilding(building);
      setSearchFor(null);
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
      if (searchFor) {
        return <SearchSheet buildings={buildings} onPressBuilding={handleInternalSearch} />;
      }

      if (mode === 'search') {
        return <SearchSheet buildings={buildings} onPressBuilding={closeSearchBuilding} />;
      }

      if (activeView === 'building') {
        return (
          <BuildingDetails
            selectedBuilding={selectedBuilding}
            onClose={closeSheet}
            onShowDirections={showDirections}
          />
        );
      }
      if (activeView === 'directions')
        return (
          <DirectionDetails
            onClose={closeSheet}
            startBuilding={startBuilding}
            destinationBuilding={destinationBuilding}
            onPressStart={() => setSearchFor('start')}
            onPressDestination={() => setSearchFor('destination')}
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
