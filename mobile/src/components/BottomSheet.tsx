/**BottomSlider.tsx is a template to allow other components such as BuildingDetails.tsx
 * to slot inside information into the BottomSheet**/

import React, {
  useCallback,
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
import { centroidOfPolygons } from '../utils/geoJson';
import { fetchOutdoorDirections } from '../services/googleDirections';
import type { OutdoorRouteOverlay } from '../types/Map';
import type { SharedValue } from 'react-native-reanimated';

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
  passOutdoorRoute: (route: OutdoorRouteOverlay | null) => void;
  animatedPosition?: SharedValue<number>;
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
      passOutdoorRoute,
      animatedPosition,
    },
    ref,
  ) => {
    const sheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => ['47%', '82%'], []);

    const [activeView, setActiveView] = useState<ViewType>('building');

    const [startBuilding, setStartBuilding] = useState<BuildingShape | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<BuildingShape | null>(null);
    const [isRouteLoading, setIsRouteLoading] = useState(false);
    const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);
    const [routeDistanceText, setRouteDistanceText] = useState<string | null>(null);
    const [routeDurationText, setRouteDurationText] = useState<string | null>(null);
    const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);

    const resetRouteState = useCallback(
      (errorMessage: string | null = null) => {
        setIsRouteLoading(false);
        setRouteErrorMessage(errorMessage);
        setRouteDistanceText(null);
        setRouteDurationText(null);
        setRouteDurationSeconds(null);
        passOutdoorRoute(null);
      },
      [passOutdoorRoute],
    );

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = (index: number = 0) => {
      sheetRef.current?.snapToIndex(index);
    };
    const setSnapPoint = (index: number) => {
      sheetRef.current?.snapToIndex(index);
    };

    const [searchFor, setSearchFor] = useState<'start' | 'destination' | null>(null);
    const isInternalSearch = searchFor !== null;
    const isGlobalSearch = mode === 'search';
    const isSearchActive = isInternalSearch || isGlobalSearch;

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
      resetRouteState();
    };

    const handleSheetAnimate = useCallback(
      (_fromIndex: number, toIndex: number) => {
        if (toIndex === -1) {
          revealSearchBar();
        }
      },
      [revealSearchBar],
    );

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

    const startCoords = useMemo(() => {
      if (startBuilding) return centroidOfPolygons(startBuilding.polygons);
      if (currentBuilding) return centroidOfPolygons(currentBuilding.polygons);
      return userLocation;
    }, [currentBuilding, startBuilding, userLocation]);

    const destinationCoords = useMemo(() => {
      if (!destinationBuilding) return null;
      return centroidOfPolygons(destinationBuilding.polygons);
    }, [destinationBuilding]);

    const startCampus = startBuilding?.campus ?? currentBuilding?.campus ?? null;
    const destinationCampus = destinationBuilding?.campus ?? null;
    const isCrossCampusRoute = Boolean(
      startCampus && destinationCampus && startCampus !== destinationCampus,
    );

    useEffect(() => {
      // Not an error state: directions panel is not active, so route UI should be reset.
      if (activeView !== 'directions') {
        resetRouteState();
        return;
      }
      // Not an error state: route cannot be requested until both endpoints are available.
      if (!startCoords || !destinationCoords) {
        resetRouteState();
        return;
      }
      // Validation error state: start and destination must be different buildings.
      if (
        startBuilding?.id &&
        destinationBuilding?.id &&
        startBuilding.id === destinationBuilding.id
      ) {
        resetRouteState('Start and destination cannot be the same.');
        return;
      }

      let cancelled = false;

      const loadRoute = async () => {
        setIsRouteLoading(true);
        setRouteErrorMessage(null);
        try {
          const route = await fetchOutdoorDirections({
            origin: startCoords,
            destination: destinationCoords,
            mode: 'walking',
          });

          if (cancelled) return;

          setRouteDistanceText(route.distanceText);
          setRouteDurationText(route.durationText);
          setRouteDurationSeconds(route.durationSeconds);
          setIsRouteLoading(false);
          passOutdoorRoute({
            encodedPolyline: route.polyline,
            start: startCoords,
            destination: destinationCoords,
            distanceText: route.distanceText,
            durationText: route.durationText,
          });
        } catch (error) {
          if (cancelled) return;
          console.warn('Failed to fetch outdoor directions', error);
          resetRouteState('Unable to load route. Please try again.');
        }
      };

      void loadRoute();

      return () => {
        cancelled = true;
      };
    }, [
      activeView,
      destinationBuilding?.id,
      destinationCoords,
      passOutdoorRoute,
      resetRouteState,
      startBuilding?.id,
      startCoords,
    ]);

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
        animatedPosition={animatedPosition}
        onAnimate={handleSheetAnimate}
        onClose={handleSheetClose}
      >
        <BottomSheetView style={buildingDetailsStyles.container}>
          {isSearchActive ? (
            <SearchSheet
              buildings={buildings}
              onPressBuilding={isInternalSearch ? handleInternalSearch : closeSearchBuilding}
            />
          ) : activeView === 'building' ? (
            <BuildingDetails
              selectedBuilding={selectedBuilding}
              onClose={closeSheet}
              onShowDirections={showDirections}
              currentBuilding={currentBuilding}
              userLocation={userLocation}
            />
          ) : (
            <DirectionDetails
              onClose={closeSheet}
              startBuilding={startBuilding}
              destinationBuilding={destinationBuilding}
              userLocation={userLocation}
              currentBuilding={currentBuilding}
              isCrossCampusRoute={isCrossCampusRoute}
              isRouteLoading={isRouteLoading}
              routeErrorMessage={routeErrorMessage}
              routeDistanceText={routeDistanceText}
              routeDurationText={routeDurationText}
              routeDurationSeconds={routeDurationSeconds}
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
