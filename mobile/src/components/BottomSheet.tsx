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
import { Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { ViewType } from '../types/ViewType';
import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import BuildingDetails from './BuildingDetails';
import DirectionDetails from './DirectionDetails';
import TransitPlanDetails from './TransitPlanDetails';
import ShuttleScheduleDetails from './ShuttleScheduleDetails';
import type { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';
import { centroidOfPolygons } from '../utils/geoJson';
import { fetchOutdoorDirections } from '../services/googleDirections';
import type { OutdoorRouteOverlay } from '../types/Map';
import type { LatLng } from 'react-native-maps';
import {
  DirectionsServiceError,
  type DirectionsTravelMode,
  type TransitInstruction,
} from '../types/Directions';
import type { RoutePlannerMode } from '../types/SheetMode';
import type { SharedValue } from 'react-native-reanimated';
import { decodePolyline } from '../utils/polyline';
import { formatEta } from '../utils/directionsFormatting';
import { buildShuttlePlan } from '../services/shuttlePlanner';
import type { ShuttlePlan } from '../types/Shuttle';

import SearchSheet from './SearchSheet';
import CalendarSelectionSlider from './CalendarSelectionSlider';
import UpcomingClassesSlider from './UpcomingClassesSlider';

const SHEET_INDEX_NAVIGATION_MAX = 1;
const SHEET_INDEX_PANEL = 2;
const SHEET_INDEX_EXPANDED = 3;
const NAVIGATION_SNAP_POINTS = ['22%', '26%'] as const;
const DEFAULT_SNAP_POINTS = ['22%', '29%', '47%', '78%'] as const;
const DIRECTIONS_SNAP_POINTS = Array.from({ length: 61 }, (_value, index) => `${22 + index}%`);
const SHUTTLE_SCHEDULE_SNAP_POINTS = Array.from(
  { length: 74 },
  (_value, index) => `${22 + index}%`,
);
const DIRECTIONS_PANEL_SNAP_POINT = '52%';
const DIRECTIONS_TRANSIT_CROSS_CAMPUS_SNAP_POINT = '52%';
const SEARCH_EXPANDED_SNAP_POINT = '78%';
const SHUTTLE_SCHEDULE_EXPANDED_SNAP_POINT = '92%';

const METERS_PER_DEGREE_LAT = 110540;
const METERS_PER_DEGREE_LON_AT_EQUATOR = 111320;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getPolylineLengthMeters = (coordinates: LatLng[]) => {
  if (coordinates.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i += 1) {
    const a = coordinates[i];
    const b = coordinates[i + 1];
    const avgLatRad = toRadians((a.latitude + b.latitude) / 2);
    const lonScale = METERS_PER_DEGREE_LON_AT_EQUATOR * Math.cos(avgLatRad);
    const dx = (b.longitude - a.longitude) * lonScale;
    const dy = (b.latitude - a.latitude) * METERS_PER_DEGREE_LAT;
    total += Math.hypot(dx, dy);
  }

  return total;
};

const getProjectedDistanceAlongRouteMeters = (point: LatLng, routeCoordinates: LatLng[]) => {
  if (routeCoordinates.length < 2) return 0;

  let bestDistanceSq = Number.POSITIVE_INFINITY;
  let bestDistanceAlongMeters = 0;
  let cumulativeDistanceMeters = 0;

  for (let i = 0; i < routeCoordinates.length - 1; i += 1) {
    const start = routeCoordinates[i];
    const end = routeCoordinates[i + 1];

    const avgLatRad = toRadians((start.latitude + end.latitude + point.latitude) / 3);
    const lonScale = METERS_PER_DEGREE_LON_AT_EQUATOR * Math.cos(avgLatRad);

    const segmentX = (end.longitude - start.longitude) * lonScale;
    const segmentY = (end.latitude - start.latitude) * METERS_PER_DEGREE_LAT;
    const pointX = (point.longitude - start.longitude) * lonScale;
    const pointY = (point.latitude - start.latitude) * METERS_PER_DEGREE_LAT;

    const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;
    const segmentLengthMeters = Math.sqrt(segmentLengthSq);
    const projectionT =
      segmentLengthSq > 0
        ? clamp((pointX * segmentX + pointY * segmentY) / segmentLengthSq, 0, 1)
        : 0;

    const projectedX = segmentX * projectionT;
    const projectedY = segmentY * projectionT;
    const distanceSqToSegment = (pointX - projectedX) ** 2 + (pointY - projectedY) ** 2;

    if (distanceSqToSegment < bestDistanceSq) {
      bestDistanceSq = distanceSqToSegment;
      bestDistanceAlongMeters = cumulativeDistanceMeters + segmentLengthMeters * projectionT;
    }

    cumulativeDistanceMeters += segmentLengthMeters;
  }

  return bestDistanceAlongMeters;
};

const formatDistanceStat = (meters: number) => {
  if (meters < 1000) {
    return {
      value: `${Math.max(0, Math.round(meters))}`,
      label: 'm',
    };
  }

  return {
    value: (meters / 1000).toFixed(1),
    label: 'km',
  };
};

const formatDurationStat = (seconds: number) => {
  const clampedSeconds = Math.max(0, Math.round(seconds));
  const totalMinutes = Math.max(0, Math.round(clampedSeconds / 60));

  if (totalMinutes < 60) {
    return {
      value: `${Math.max(1, totalMinutes)}`,
      label: 'min',
    };
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
  return {
    value: hourText,
    label: 'time',
  };
};

const toInternalSnapIndex = (index: number) => {
  if (index <= 0) return SHEET_INDEX_PANEL;
  if (index === 1) return SHEET_INDEX_EXPANDED;
  return index;
};

const isShuttleWeekdayDebugEnabled = () =>
  (process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY ?? '').trim().toLowerCase() === 'true';

const getForcedShuttlePlanningDate = (): Date | null => {
  const raw = (process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME ?? '').trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getShuttlePlanningDate = (now: Date) => {
  const forcedPlanningDate = getForcedShuttlePlanningDate();
  if (forcedPlanningDate) return forcedPlanningDate;

  if (!isShuttleWeekdayDebugEnabled()) return now;

  const day = now.getDay();
  if (day === 0) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
  }

  if (day === 6) {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 2,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds(),
    );
  }

  return now;
};

const getDirectionsPanelSnapPoint = (travelMode: RoutePlannerMode, isCrossCampusRoute: boolean) =>
  travelMode === 'shuttle' && isCrossCampusRoute
    ? DIRECTIONS_TRANSIT_CROSS_CAMPUS_SNAP_POINT
    : DIRECTIONS_PANEL_SNAP_POINT;

const toDirectionsTravelMode = (travelMode: RoutePlannerMode): DirectionsTravelMode =>
  travelMode === 'shuttle' ? 'transit' : travelMode;

export type BottomSliderHandle = {
  open: (index?: number) => void;
  close: () => void;
  setSnap: (index: number) => void;
  closeCalendarSlider: () => void;
  openCalendarEventsSlider: (calendarIds: string[]) => void;
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
    const [activeView, setActiveView] = useState<ViewType>('building');
    const snapPoints = useMemo(() => {
      if (activeView === 'navigation') return [...NAVIGATION_SNAP_POINTS];
      if (activeView === 'directions') return [...DIRECTIONS_SNAP_POINTS];
      if (activeView === 'shuttle-schedule') return [...SHUTTLE_SCHEDULE_SNAP_POINTS];
      return [...DEFAULT_SNAP_POINTS];
    }, [activeView]);

    const [startBuilding, setStartBuilding] = useState<BuildingShape | null>(null);
    const [destinationBuilding, setDestinationBuilding] = useState<BuildingShape | null>(null);
    const [startLocationSnapshot, setStartLocationSnapshot] = useState<UserCoords | null>(null);
    const [routeStartSource, setRouteStartSource] = useState<'current' | 'manual'>('current');
    const [isRouteLoading, setIsRouteLoading] = useState(false);
    const [routeErrorMessage, setRouteErrorMessage] = useState<string | null>(null);
    const [routeDistanceText, setRouteDistanceText] = useState<string | null>(null);
    const [routeDistanceMeters, setRouteDistanceMeters] = useState<number | null>(null);
    const [routeDurationText, setRouteDurationText] = useState<string | null>(null);
    const [routeDurationSeconds, setRouteDurationSeconds] = useState<number | null>(null);
    const [routeEncodedPolyline, setRouteEncodedPolyline] = useState<string>('');
    const [navigationProgressMeters, setNavigationProgressMeters] = useState(0);
    const [routeTransitSteps, setRouteTransitSteps] = useState<TransitInstruction[]>([]);
    const [travelMode, setTravelMode] = useState<RoutePlannerMode>('walking');
    const [shuttlePlan, setShuttlePlan] = useState<ShuttlePlan | null>(null);
    const startCampus = startBuilding?.campus ?? currentBuilding?.campus ?? null;
    const destinationCampus = destinationBuilding?.campus ?? null;
    const isCrossCampusRoute = Boolean(
      startCampus && destinationCampus && startCampus !== destinationCampus,
    );

    const resetRouteState = useCallback(
      (errorMessage: string | null = null) => {
        setIsRouteLoading(false);
        setRouteErrorMessage(errorMessage);
        setRouteDistanceText(null);
        setRouteDistanceMeters(null);
        setRouteDurationText(null);
        setRouteDurationSeconds(null);
        setRouteEncodedPolyline('');
        setNavigationProgressMeters(0);
        setRouteTransitSteps([]);
        passOutdoorRoute(null);
      },
      [passOutdoorRoute],
    );

    const closeSheet = () => sheetRef.current?.close();
    const openSheet = (index: number = 0) => {
      if (activeView === 'directions') {
        snapToDirectionsPanel(getDirectionsPanelSnapPoint(travelMode, isCrossCampusRoute));
        return;
      }
      sheetRef.current?.snapToIndex(toInternalSnapIndex(index));
    };
    const setSnapPoint = (index: number) => {
      sheetRef.current?.snapToIndex(toInternalSnapIndex(index));
    };
    const snapToKnownPosition = useCallback(
      (position: string, fallbackIndex: number) => {
        if (sheetRef.current?.snapToPosition) {
          sheetRef.current.snapToPosition(position);
          return;
        }

        const fallbackPositionIndex = snapPoints.indexOf(position);
        const safeFallbackIndex =
          fallbackPositionIndex >= 0
            ? fallbackPositionIndex
            : Math.min(fallbackIndex, snapPoints.length - 1);
        sheetRef.current?.snapToIndex(safeFallbackIndex);
      },
      [snapPoints],
    );

    const snapToDirectionsPanel = useCallback(
      (position: string = DIRECTIONS_PANEL_SNAP_POINT) => {
        requestAnimationFrame(() => {
          snapToKnownPosition(position, SHEET_INDEX_EXPANDED);
        });
      },
      [snapToKnownPosition],
    );

    const directionsPanelSnapPoint = useMemo(
      () => getDirectionsPanelSnapPoint(travelMode, isCrossCampusRoute),
      [travelMode, isCrossCampusRoute],
    );

    useEffect(() => {
      if (activeView !== 'directions') return;

      snapToDirectionsPanel(directionsPanelSnapPoint);
    }, [activeView, directionsPanelSnapPoint, snapToDirectionsPanel]);

    const [searchFor, setSearchFor] = useState<'start' | 'destination' | null>(null);
    const [calendarSliderMode, setCalendarSliderMode] = useState<'selection' | 'events' | null>(
      null,
    );
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
    const isInternalSearch = searchFor !== null;
    const isGlobalSearch = mode === 'search';
    const isSearchActive = isInternalSearch || isGlobalSearch || calendarSliderMode !== null;

    const openCalendarSelectionSlider = useCallback(
      (resetSelection: boolean = false) => {
        if (resetSelection) {
          setSelectedCalendarIds([]);
        }
        setCalendarSliderMode('selection');
        requestAnimationFrame(() => {
          snapToKnownPosition(SEARCH_EXPANDED_SNAP_POINT, SHEET_INDEX_EXPANDED);
        });
      },
      [snapToKnownPosition],
    );

    const showUpcomingClassesSlider = useCallback(
      (calendarIds: string[]) => {
        setSelectedCalendarIds(calendarIds);
        setCalendarSliderMode('events');
        requestAnimationFrame(() => {
          snapToKnownPosition(SEARCH_EXPANDED_SNAP_POINT, SHEET_INDEX_EXPANDED);
        });
      },
      [snapToKnownPosition],
    );

    const openCalendarSelectionAfterConnect = useCallback(() => {
      openCalendarSelectionSlider(true);
    }, [openCalendarSelectionSlider]);

    const handleCalendarGoFromSearch = useCallback(() => {
      if (selectedCalendarIds.length > 0) {
        showUpcomingClassesSlider(selectedCalendarIds);
        return;
      }

      openCalendarSelectionSlider();
    }, [openCalendarSelectionSlider, selectedCalendarIds, showUpcomingClassesSlider]);

    const handleReselectCalendars = useCallback(() => {
      openCalendarSelectionSlider();
    }, [openCalendarSelectionSlider]);

    const handleCloseUpcomingClassesSlider = useCallback(() => {
      setCalendarSliderMode(null);
    }, []);

    const handleCloseCalendarSelectionSlider = useCallback(() => {
      setCalendarSliderMode(null);
    }, []);

    const showDirections = (building: BuildingShape, asDestination?: boolean) => {
      setTravelMode('walking');
      setRouteStartSource('current');
      if (asDestination) {
        // Walking figure: building is destination, start is current location
        setStartBuilding(currentBuilding ?? null);
        setStartLocationSnapshot(currentBuilding ? null : userLocation);
        setDestinationBuilding(building);
      } else {
        // "Set as starting point" button: building is start
        setRouteStartSource('manual');
        setStartBuilding(building);
        setStartLocationSnapshot(null);
        setDestinationBuilding(null);
      }
      setActiveView('directions');
      snapToDirectionsPanel(DIRECTIONS_PANEL_SNAP_POINT);
    };

    const showTransitPlan = () => {
      setActiveView('transit-plan');
      sheetRef.current?.snapToIndex(SHEET_INDEX_EXPANDED);
    };

    const showDirectionsPanel = () => {
      setActiveView('directions');
      snapToDirectionsPanel(directionsPanelSnapPoint);
    };

    const showShuttleSchedule = useCallback(() => {
      setActiveView('shuttle-schedule');
      requestAnimationFrame(() => {
        snapToKnownPosition(SHUTTLE_SCHEDULE_EXPANDED_SNAP_POINT, SHEET_INDEX_EXPANDED);
      });
    }, [snapToKnownPosition]);

    const handleSheetClose = () => {
      setActiveView('building');
      setSearchFor(null);
      setCalendarSliderMode(null);
      setSelectedCalendarIds([]);
      setTravelMode('walking');
      setShuttlePlan(null);
      setRouteStartSource('current');
      setStartLocationSnapshot(null);
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
      setStartBuilding(currentBuilding ?? null);
      setStartLocationSnapshot(currentBuilding ? null : userLocation);
      setDestinationBuilding(chosenBuilding);
      setTravelMode('walking');
      setRouteStartSource('current');
      setActiveView('directions');
      onExitSearch();
      snapToDirectionsPanel(DIRECTIONS_PANEL_SNAP_POINT);
    };

    const handleInternalSearch = (building: BuildingShape) => {
      passSelectedBuilding(building);
      if (searchFor === 'start') {
        setRouteStartSource('manual');
        setStartBuilding(building);
        setStartLocationSnapshot(null);
      } else setDestinationBuilding(building);
      setSearchFor(null);
      snapToDirectionsPanel(directionsPanelSnapPoint);
    };

    useEffect(() => {
      if (activeView !== 'directions') return;
      if (!selectedBuilding) return;
      if (selectedBuilding.id === startBuilding?.id) return;

      setDestinationBuilding(selectedBuilding);
    }, [selectedBuilding, activeView]);

    const startCoords = useMemo(() => {
      if (startBuilding) return centroidOfPolygons(startBuilding.polygons);
      if (startLocationSnapshot) return startLocationSnapshot;
      if (currentBuilding) return centroidOfPolygons(currentBuilding.polygons);
      return userLocation;
    }, [currentBuilding, startBuilding, startLocationSnapshot, userLocation]);

    const destinationCoords = useMemo(() => {
      if (!destinationBuilding) return null;
      return centroidOfPolygons(destinationBuilding.polygons);
    }, [destinationBuilding]);

    const routeCoordinates = useMemo(
      () => decodePolyline(routeEncodedPolyline),
      [routeEncodedPolyline],
    );
    const routePolylineLengthMeters = useMemo(
      () => getPolylineLengthMeters(routeCoordinates),
      [routeCoordinates],
    );

    useEffect(() => {
      if (activeView !== 'navigation') return;
      if (!userLocation) return;
      if (routeCoordinates.length < 2) return;

      const projectedMeters = getProjectedDistanceAlongRouteMeters(userLocation, routeCoordinates);
      setNavigationProgressMeters((previousProgress) =>
        Math.max(previousProgress, projectedMeters),
      );
    }, [activeView, routeCoordinates, userLocation]);

    const navigationSummary = useMemo(() => {
      const totalDurationSeconds = routeDurationSeconds ?? 0;
      const totalDistanceMeters = routeDistanceMeters ?? routePolylineLengthMeters;
      const polylineLengthMeters = routePolylineLengthMeters;

      if (totalDurationSeconds <= 0 || totalDistanceMeters <= 0 || polylineLengthMeters <= 0) {
        return null;
      }

      const progressRatio = clamp(navigationProgressMeters / polylineLengthMeters, 0, 1);
      const remainingDistanceMeters = Math.max(0, totalDistanceMeters * (1 - progressRatio));
      const remainingDurationSeconds = Math.max(
        0,
        Math.round(totalDurationSeconds * (1 - progressRatio)),
      );

      const arrivalValue = formatEta(remainingDurationSeconds) ?? 'Now';
      const durationStat = formatDurationStat(remainingDurationSeconds);
      const distanceStat = formatDistanceStat(remainingDistanceMeters);

      return {
        arrivalValue,
        durationStat,
        distanceStat,
      };
    }, [
      navigationProgressMeters,
      routeDistanceMeters,
      routeDurationSeconds,
      routePolylineLengthMeters,
    ]);

    const canStartNavigationFromCurrentLocation = routeStartSource === 'current';
    const shuttlePickupCoords =
      travelMode === 'shuttle' &&
      shuttlePlan?.isServiceAvailable &&
      shuttlePlan.nextDepartureInMinutes !== null
        ? (shuttlePlan.pickup?.coords ?? null)
        : null;
    const routeDestinationCoords = shuttlePickupCoords ?? destinationCoords;
    const routeRequestMode: DirectionsTravelMode =
      shuttlePickupCoords !== null ? 'walking' : toDirectionsTravelMode(travelMode);

    useEffect(() => {
      const shouldComputeShuttlePlan =
        (activeView === 'directions' || activeView === 'shuttle-schedule') &&
        travelMode === 'shuttle';

      if (!shouldComputeShuttlePlan || !startCampus || !destinationCampus) {
        setShuttlePlan(null);
        return;
      }

      setShuttlePlan(
        buildShuttlePlan({
          startCampus,
          destinationCampus,
          startCoords: startCoords ?? null,
          now: getShuttlePlanningDate(new Date()),
        }),
      );
    }, [activeView, destinationCampus, startCampus, startCoords, travelMode]);

    const showNavigationSummary = useCallback(() => {
      setActiveView('navigation');
      sheetRef.current?.snapToIndex(SHEET_INDEX_NAVIGATION_MAX);
    }, []);

    const endNavigation = useCallback(() => {
      setActiveView('directions');
      snapToDirectionsPanel();
    }, [snapToDirectionsPanel]);

    const handleDirectionsGo = useCallback(
      (mode: RoutePlannerMode) => {
        if (mode === 'transit') {
          showTransitPlan();
          return;
        }
        if (mode === 'shuttle') {
          showShuttleSchedule();
          return;
        }
        if (!canStartNavigationFromCurrentLocation) return;

        showNavigationSummary();
      },
      [canStartNavigationFromCurrentLocation, showNavigationSummary, showShuttleSchedule],
    );

    useEffect(() => {
      // Not an error state: directions panel is not active, so route UI should be reset.
      if (
        activeView !== 'directions' &&
        activeView !== 'transit-plan' &&
        activeView !== 'shuttle-schedule' &&
        activeView !== 'navigation'
      ) {
        resetRouteState();
        return;
      }
      if (activeView !== 'directions') return;
      if (travelMode === 'shuttle' && !shuttlePickupCoords) {
        resetRouteState();
        return;
      }
      const targetDestination = routeDestinationCoords;
      // Not an error state: route cannot be requested until both endpoints are available.
      if (!startCoords || !targetDestination) {
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
            destination: targetDestination,
            mode: routeRequestMode,
          });

          if (cancelled) return;

          setRouteDistanceText(route.distanceText);
          setRouteDistanceMeters(route.distanceMeters);
          setRouteDurationText(route.durationText);
          setRouteDurationSeconds(route.durationSeconds);
          setRouteEncodedPolyline(route.polyline);
          setNavigationProgressMeters(0);
          setRouteTransitSteps(route.transitInstructions ?? []);
          setIsRouteLoading(false);
          passOutdoorRoute({
            encodedPolyline: route.polyline,
            start: startCoords,
            destination: targetDestination,
            isWalkingRoute: routeRequestMode === 'walking',
            routeSegments: route.routeSegments?.map((segment) => ({
              encodedPolyline: segment.polyline,
              requiresWalking: segment.mode === 'walking',
            })),
            distanceText: route.distanceText,
            durationText: route.durationText,
            distanceMeters: route.distanceMeters,
            durationSeconds: route.durationSeconds,
          });
        } catch (error) {
          if (cancelled) return;
          console.warn('Failed to fetch outdoor directions', error);
          if (error instanceof DirectionsServiceError) {
            if (error.code === 'MISSING_API_KEY') {
              resetRouteState('Google Directions API key is missing.');
              return;
            }
            if (error.code === 'NO_ROUTE') {
              resetRouteState('No route found for this start and destination.');
              return;
            }
          }
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
      passOutdoorRoute,
      resetRouteState,
      routeDestinationCoords,
      routeRequestMode,
      shuttlePickupCoords,
      startBuilding?.id,
      startCoords,
      travelMode,
    ]);

    useEffect(() => {
      if (mode !== 'search') {
        setCalendarSliderMode(null);
      }
    }, [mode]);

    useEffect(() => {
      const isSearching = mode === 'search' || searchFor !== null;
      if (!isSearching) return;

      const frame = requestAnimationFrame(() => {
        snapToKnownPosition(SEARCH_EXPANDED_SNAP_POINT, SHEET_INDEX_EXPANDED);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, [mode, searchFor, snapToKnownPosition]);

    useImperativeHandle(ref, () => ({
      open: openSheet,
      close: closeSheet,
      setSnap: setSnapPoint,
      closeCalendarSlider: () => setCalendarSliderMode(null),
      openCalendarEventsSlider: (calendarIds: string[]) => {
        showUpcomingClassesSlider(calendarIds);
      },
    }));

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={buildingDetailsStyles.sheetBackground}
        handleIndicatorStyle={buildingDetailsStyles.handle}
        enablePanDownToClose={true}
        enableHandlePanningGesture={true}
        enableContentPanningGesture={true}
        enableDynamicSizing={false}
        animatedPosition={animatedPosition}
        onAnimate={handleSheetAnimate}
        onClose={handleSheetClose}
      >
        <BottomSheetView style={buildingDetailsStyles.container}>
          {isSearchActive ? (
            calendarSliderMode === 'events' && !isInternalSearch ? (
              <UpcomingClassesSlider
                selectedCalendarIds={selectedCalendarIds}
                onReselectCalendars={handleReselectCalendars}
                onClose={handleCloseUpcomingClassesSlider}
              />
            ) : calendarSliderMode === 'selection' && !isInternalSearch ? (
              <CalendarSelectionSlider
                initialSelectedCalendarIds={selectedCalendarIds}
                onDone={showUpcomingClassesSlider}
                onClose={handleCloseCalendarSelectionSlider}
              />
            ) : (
              <SearchSheet
                buildings={buildings}
                onPressBuilding={isInternalSearch ? handleInternalSearch : closeSearchBuilding}
                onCalendarConnected={openCalendarSelectionAfterConnect}
                selectedCalendarIds={selectedCalendarIds}
                onCalendarGoPress={handleCalendarGoFromSearch}
              />
            )
          ) : activeView === 'building' ? (
            <BuildingDetails
              selectedBuilding={selectedBuilding}
              onClose={closeSheet}
              onShowDirections={showDirections}
              currentBuilding={currentBuilding}
              userLocation={userLocation}
            />
          ) : activeView === 'transit-plan' ? (
            <TransitPlanDetails
              destinationBuilding={destinationBuilding}
              routeTransitSteps={routeTransitSteps}
              onBack={showDirectionsPanel}
              onClose={closeSheet}
            />
          ) : activeView === 'shuttle-schedule' ? (
            <ShuttleScheduleDetails
              startBuilding={startBuilding}
              destinationBuilding={destinationBuilding}
              shuttlePlan={shuttlePlan}
              onBack={showDirectionsPanel}
              onClose={closeSheet}
            />
          ) : activeView === 'navigation' ? (
            <>
              <View style={directionDetailsStyles.navigationSummaryCard}>
                <View style={directionDetailsStyles.navigationSummaryRow}>
                  <View style={directionDetailsStyles.navigationSummaryStat}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={directionDetailsStyles.navigationSummaryValue}
                    >
                      {navigationSummary?.arrivalValue ?? '--:--'}
                    </Text>
                    <Text style={directionDetailsStyles.navigationSummaryLabel}>arrival</Text>
                  </View>
                  <View style={directionDetailsStyles.navigationSummaryDivider} />
                  <View style={directionDetailsStyles.navigationSummaryStat}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={directionDetailsStyles.navigationSummaryValue}
                    >
                      {navigationSummary?.durationStat.value ?? '--'}
                    </Text>
                    <Text style={directionDetailsStyles.navigationSummaryLabel}>
                      {navigationSummary?.durationStat.label ?? 'min'}
                    </Text>
                  </View>
                  <View style={directionDetailsStyles.navigationSummaryDivider} />
                  <View style={directionDetailsStyles.navigationSummaryStat}>
                    <Text
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={directionDetailsStyles.navigationSummaryValue}
                    >
                      {navigationSummary?.distanceStat.value ?? '--'}
                    </Text>
                    <Text style={directionDetailsStyles.navigationSummaryLabel}>
                      {navigationSummary?.distanceStat.label ?? 'km'}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                testID="end-navigation-button"
                accessibilityRole="button"
                activeOpacity={0.88}
                onPress={endNavigation}
                style={directionDetailsStyles.navigationEndButton}
              >
                <Text style={directionDetailsStyles.navigationEndButtonText}>End Navigation</Text>
              </TouchableOpacity>
            </>
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
              selectedTravelMode={travelMode}
              shuttlePlan={shuttlePlan}
              canStartNavigation={canStartNavigationFromCurrentLocation}
              onPressStart={() => setSearchFor('start')}
              onPressDestination={() => setSearchFor('destination')}
              onTravelModeChange={setTravelMode}
              onPressGo={handleDirectionsGo}
              onPressShuttleSchedule={showShuttleSchedule}
            />
          )}
        </BottomSheetView>
        {/**TO DO: Add in GoogleCalendar Bottom sheet view */}
      </BottomSheet>
    );
  },
);

export default BottomSlider;
