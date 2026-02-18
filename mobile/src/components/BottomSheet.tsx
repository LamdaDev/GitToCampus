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
import { ViewType } from '../types/ViewType';
import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import BuildingDetails from './BuildingDetails';
import DirectionDetails from './DirectionDetails';
import type { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';

import SearchSheet from './SearchSheet';
export type BottomSliderHandle = {
  open: (index?: number) => void;
  close: () => void;
  setSnap: (index: number) => void;
};

type BottomSheetProps = {
  selectedBuilding: BuildingShape | null;
  userLocation: UserCoords | null;
  currentBuilding: BuildingShape | null;

  mode: 'detail' | 'search';
  revealSearchBar: () => void;
  buildings: BuildingShape[];
  onExitSearch: () => void;
  passSelectedBuilding: (b: BuildingShape | null) => void;
};

const BottomSlider = forwardRef<BottomSliderHandle, BottomSheetProps>(
  (
    {
      selectedBuilding,
      userLocation,
      currentBuilding,
      mode,
      revealSearchBar,
      buildings,
      onExitSearch,
      passSelectedBuilding,
    },
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
    const setSnapPoint = (index: number) => {
      sheetRef.current?.snapToIndex(index);
    };

    const [searchFor, setSearchFor] = useState<'start' | 'destination' | null>(null);

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
      setSearchFor(null);
      revealSearchBar();
    };

    const closeSearchBuilding = (chosenBuilding: BuildingShape) => {
      passSelectedBuilding(chosenBuilding);

      //SET START BUILDING SHOULD BE WHERE USER IS CURRENTLY POSITION. (FOR FUTURE USES)
      setStartBuilding(null);
      setDestinationBuilding(chosenBuilding);
      setActiveView('directions');
      onExitSearch();
      sheetRef.current?.snapToIndex(0);
    };

    const handleInternalSearch = (building: BuildingShape) => {
      passSelectedBuilding(building);
      if (searchFor === 'start') setStartBuilding(building);
      else setDestinationBuilding(building);
      setSearchFor(null);
      sheetRef.current?.snapToIndex(0);
    };

    useEffect(() => {
      if (activeView !== 'directions') return;
      if (!selectedBuilding) return;
      if (selectedBuilding.id === startBuilding?.id) return;

      setDestinationBuilding(selectedBuilding);
    }, [selectedBuilding, activeView]);

    useEffect(() => {
      const isSearching = mode === 'search' || searchFor !== null;
      if (!isSearching) return;

      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(1);
      });
    }, [mode, searchFor]);

    useImperativeHandle(ref, () => ({
      open: openSheet,
      close: closeSheet,
      setSnap: setSnapPoint,
    }));

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
        <BottomSheetView style={buildingDetailsStyles.container}>
          {searchFor && (
            <SearchSheet buildings={buildings} onPressBuilding={handleInternalSearch} />
          )}
          {mode === 'search' && (
            <SearchSheet buildings={buildings} onPressBuilding={closeSearchBuilding} />
          )}
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
              onPressStart={() => setSearchFor('start')}
              onPressDestination={() => setSearchFor('destination')}
            />
          )}
        </BottomSheetView>
        {/**TO DO: Add in GoogleCalendar Bottom sheet view */}
      </BottomSheet>
    );
  },
);

export default BottomSlider;
