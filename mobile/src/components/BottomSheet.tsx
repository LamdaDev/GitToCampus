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
import { fetchShuttleCompositeDirections } from '../services/directions/shuttleCompositeDirections';
import type { GoogleCalendarEventItem } from '../services/googleCalendarAuth';
import {
  CALENDAR_LOCATION_NOT_FOUND_MESSAGE,
  getManualStartReasonMessage,
  resolveCalendarRouteLocation,
} from '../utils/calendarRouteLocation';

import SearchSheet from './SearchSheet';
import CalendarSelectionSlider from './CalendarSelectionSlider';
import UpcomingClassesSlider from './UpcomingClassesSlider';

const SHEET_INDEX_NAVIGATION_MAX = 1;
const SHEET_INDEX_PANEL = 2;
const SHEET_INDEX_EXPANDED = 3;
const NAVIGATION_SNAP_POINTS = ['22%', '26%'] as const;
const DEFAULT_SNAP_POINTS = ['22%', '29%', '47%', '75%'] as const;
const DIRECTIONS_SNAP_POINTS = Array.from({ length: 61 }, (_value, index) => `${22 + index}%`);
const SHUTTLE_SCHEDULE_SNAP_POINTS = Array.from(
  { length: 74 },
  (_value, index) => `${22 + index}%`,
);
const DIRECTIONS_PANEL_SNAP_POINT = '52%';
const DIRECTIONS_TRANSIT_CROSS_CAMPUS_SNAP_POINT = '52%';
const SEARCH_EXPANDED_SNAP_POINT = '75%';
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

const toRouteOverlayMode = (travelMode: RoutePlannerMode): DirectionsTravelMode => {
  if (travelMode === 'walking') return 'walking';
  if (travelMode === 'transit') return 'transit';
  return 'driving';
};

export type BottomSliderHandle = {
  open: (index?: number) => void;
  close: () => void;
  setSnap: (index: number) => void;
  closeCalendarSlider: () => void;
  openCalendarEventsSlider: (calendarIds?: string[]) => void;
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

const ROUTE_UI_VIEWS = new Set<ViewType>([
  'directions',
  'transit-plan',
  'shuttle-schedule',
  'navigation',
]);

const isRouteUiVisible = (activeView: ViewType) => ROUTE_UI_VIEWS.has(activeView);

type RouteLoadDecision =
  | { action: 'skip' }
  | { action: 'reset'; message?: string | null }
  | { action: 'load'; origin: LatLng; destination: LatLng };

const getRouteLoadDecision = ({
  activeView,
  travelMode,
  hasAvailableShuttlePlan,
  destinationCoords,
  startCoords,
  startBuildingId,
  destinationBuildingId,
}: {
  activeView: ViewType;
  travelMode: RoutePlannerMode;
  hasAvailableShuttlePlan: boolean;
  destinationCoords: LatLng | null;
  startCoords: LatLng | null;
  startBuildingId?: string;
  destinationBuildingId?: string;
}): RouteLoadDecision => {
  if (!isRouteUiVisible(activeView)) {
    return { action: 'reset', message: null };
  }

  if (activeView !== 'directions') {
    return { action: 'skip' };
  }

  if (travelMode === 'shuttle' && !hasAvailableShuttlePlan) {
    return { action: 'reset', message: null };
  }

  if (!destinationCoords) {
    return { action: 'reset', message: 'Set a destination to continue.' };
  }

  if (!startCoords) {
    return { action: 'reset', message: 'Set your start location to continue.' };
  }

  if (startBuildingId && destinationBuildingId && startBuildingId === destinationBuildingId) {
    return { action: 'reset', message: 'Start and destination cannot be the same.' };
  }

  return { action: 'load', origin: startCoords, destination: destinationCoords };
};

const toOutdoorRouteOverlay = (
  route: Awaited<ReturnType<typeof fetchOutdoorDirections>>,
  start: LatLng,
  destination: LatLng,
  mode: DirectionsTravelMode,
): OutdoorRouteOverlay => ({
  encodedPolyline: route.polyline,
  start,
  destination,
  isWalkingRoute: mode === 'walking',
  routeSegments: route.routeSegments?.map((segment) => ({
    encodedPolyline: segment.polyline,
    requiresWalking: segment.mode === 'walking',
  })),
  distanceText: route.distanceText,
  durationText: route.durationText,
  distanceMeters: route.distanceMeters,
  durationSeconds: route.durationSeconds,
});

const getRouteErrorMessage = (error: unknown): string => {
  if (error instanceof DirectionsServiceError) {
    if (error.code === 'MISSING_API_KEY') {
      return 'Google Directions API key is missing.';
    }
    if (error.code === 'NO_ROUTE') {
      return 'No route found for this start and destination.';
    }
    if (error.code === 'NETWORK_ERROR') {
      return 'Network issue while loading route. Check connection and retry.';
    }
    if (error.code === 'OVER_QUERY_LIMIT') {
      return 'Routing service limit reached. Please wait and retry.';
    }
    if (error.code === 'REQUEST_DENIED') {
      return 'Routing request was denied by Google Directions API.';
    }
    if (error.code === 'INVALID_REQUEST') {
      return 'Routing request was invalid. Update start/destination and retry.';
    }
    if (error.code === 'API_ERROR') {
      return 'Google Directions API is temporarily unavailable. Please retry.';
    }
  }

  return 'Unable to load route. Please try again.';
};

const renderBottomSheetContent = ({
  isSearchActive,
  calendarSliderMode,
  isInternalSearch,
  selectedCalendarIds,
  handleReselectCalendars,
  handleCloseUpcomingClassesSlider,
  handleCloseCalendarSelectionSlider,
  showUpcomingClassesSlider,
  buildings,
  handleInternalSearch,
  closeSearchBuilding,
  openCalendarSelectionAfterConnect,
  handleCalendarGoFromSearch,
  calendarGoErrorMessage,
  activeView,
  selectedBuilding,
  closeSheet,
  showDirections,
  currentBuilding,
  userLocation,
  destinationBuilding,
  routeTransitSteps,
  showDirectionsPanel,
  startBuilding,
  shuttlePlan,
  navigationSummary,
  endNavigation,
  isCrossCampusRoute,
  isRouteLoading,
  routeErrorMessage,
  routeDistanceText,
  routeDurationText,
  routeDurationSeconds,
  travelMode,
  canStartNavigationFromCurrentLocation,
  setSearchFor,
  setTravelMode,
  handleDirectionsGo,
  showShuttleSchedule,
  handleRetryRoute,
}: {
  isSearchActive: boolean;
  calendarSliderMode: 'selection' | 'events' | null;
  isInternalSearch: boolean;
  selectedCalendarIds: string[];
  handleReselectCalendars: () => void;
  handleCloseUpcomingClassesSlider: () => void;
  handleCloseCalendarSelectionSlider: () => void;
  showUpcomingClassesSlider: (calendarIds: string[]) => void;
  buildings: BuildingShape[];
  handleInternalSearch: (building: BuildingShape) => void;
  closeSearchBuilding: (building: BuildingShape) => void;
  openCalendarSelectionAfterConnect: () => void;
  handleCalendarGoFromSearch: (nextClassEvent: GoogleCalendarEventItem | null) => void;
  calendarGoErrorMessage: string | null;
  activeView: ViewType;
  selectedBuilding: BuildingShape | null;
  closeSheet: () => void;
  showDirections: (building: BuildingShape, asDestination?: boolean) => void;
  currentBuilding: BuildingShape | null;
  userLocation: UserCoords | null;
  destinationBuilding: BuildingShape | null;
  routeTransitSteps: TransitInstruction[];
  showDirectionsPanel: () => void;
  startBuilding: BuildingShape | null;
  shuttlePlan: ShuttlePlan | null;
  navigationSummary: {
    arrivalValue: string;
    durationStat: { value: string; label: string };
    distanceStat: { value: string; label: string };
  } | null;
  endNavigation: () => void;
  isCrossCampusRoute: boolean;
  isRouteLoading: boolean;
  routeErrorMessage: string | null;
  routeDistanceText: string | null;
  routeDurationText: string | null;
  routeDurationSeconds: number | null;
  travelMode: RoutePlannerMode;
  canStartNavigationFromCurrentLocation: boolean;
  setSearchFor: React.Dispatch<React.SetStateAction<'start' | 'destination' | null>>;
  setTravelMode: React.Dispatch<React.SetStateAction<RoutePlannerMode>>;
  handleDirectionsGo: (mode: RoutePlannerMode) => void;
  showShuttleSchedule: () => void;
  handleRetryRoute: () => void;
}) => {
  if (isSearchActive) {
    if (calendarSliderMode === 'events' && !isInternalSearch) {
      return (
        <UpcomingClassesSlider
          selectedCalendarIds={selectedCalendarIds}
          onReselectCalendars={handleReselectCalendars}
          onClose={handleCloseUpcomingClassesSlider}
        />
      );
    }

    if (calendarSliderMode === 'selection' && !isInternalSearch) {
      return (
        <CalendarSelectionSlider
          initialSelectedCalendarIds={selectedCalendarIds}
          onDone={showUpcomingClassesSlider}
          onClose={handleCloseCalendarSelectionSlider}
        />
      );
    }

    return (
      <SearchSheet
        buildings={buildings}
        onPressBuilding={isInternalSearch ? handleInternalSearch : closeSearchBuilding}
        onCalendarConnected={openCalendarSelectionAfterConnect}
        selectedCalendarIds={selectedCalendarIds}
        onCalendarGoPress={handleCalendarGoFromSearch}
        calendarGoErrorMessage={calendarGoErrorMessage}
      />
    );
  }

  if (activeView === 'building') {
    return (
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={closeSheet}
        onShowDirections={showDirections}
        currentBuilding={currentBuilding}
        userLocation={userLocation}
      />
    );
  }

  if (activeView === 'transit-plan') {
    return (
      <TransitPlanDetails
        destinationBuilding={destinationBuilding}
        routeTransitSteps={routeTransitSteps}
        onBack={showDirectionsPanel}
        onClose={closeSheet}
      />
    );
  }

  if (activeView === 'shuttle-schedule') {
    return (
      <ShuttleScheduleDetails
        startBuilding={startBuilding}
        destinationBuilding={destinationBuilding}
        shuttlePlan={shuttlePlan}
        onBack={showDirectionsPanel}
        onClose={closeSheet}
      />
    );
  }

  if (activeView === 'navigation') {
    return (
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
    );
  }

  return (
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
      onRetryRoute={handleRetryRoute}
    />
  );
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
    const [routeRetryNonce, setRouteRetryNonce] = useState(0);
    const [travelMode, setTravelMode] = useState<RoutePlannerMode>('walking');
    const [shuttlePlan, setShuttlePlan] = useState<ShuttlePlan | null>(null);
    const previousSelectedBuildingIdRef = useRef<string | null>(selectedBuilding?.id ?? null);
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

    const handleRetryRoute = useCallback(() => {
      setRouteRetryNonce((currentValue) => currentValue + 1);
    }, []);

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
    const [calendarGoErrorMessage, setCalendarGoErrorMessage] = useState<string | null>(null);
    const isInternalSearch = searchFor !== null;
    const isGlobalSearch = mode === 'search';
    const isSearchActive = isInternalSearch || isGlobalSearch || calendarSliderMode !== null;

    const openCalendarSelectionSlider = useCallback(
      (resetSelection: boolean = false) => {
        setCalendarGoErrorMessage(null);
        if (resetSelection) {
          setSelectedCalendarIds([]);
        }
        setCalendarSliderMode('selection');
        requestAnimationFrame(() => {
          snapToKnownPosition(SEARCH_EXPANDED_SNAP_POINT, SHEET_INDEX_EXPANDED);
        });
      },
      [selectedCalendarIds, snapToKnownPosition],
    );

    const showUpcomingClassesSlider = useCallback(
      (calendarIds: string[]) => {
        setCalendarGoErrorMessage(null);
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

    const handleCalendarGoFromSearch = (nextClassEvent: GoogleCalendarEventItem | null) => {
      setCalendarGoErrorMessage(null);

      if (nextClassEvent) {
        void (async () => {
          const errorMessage = await handleUpcomingClassPress(nextClassEvent);
          if (errorMessage) {
            setCalendarGoErrorMessage(errorMessage);
          }
        })();
        return;
      }

      if (selectedCalendarIds.length > 0) {
        showUpcomingClassesSlider(selectedCalendarIds);
        return;
      }

      openCalendarSelectionSlider();
    };

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
      setCalendarGoErrorMessage(null);
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

    const handleUpcomingClassPress = useCallback(
      async (event: GoogleCalendarEventItem): Promise<string | null> => {
        try {
          const resolved = await resolveCalendarRouteLocation(event.location);
          if (resolved.type === 'error') {
            return resolved.message;
          }

          const { destinationBuilding: resolvedDestinationBuilding, startPoint } = resolved.value;
          passSelectedBuilding(resolvedDestinationBuilding);
          setDestinationBuilding(resolvedDestinationBuilding);
          setTravelMode('walking');
          setCalendarSliderMode(null);
          setSearchFor(null);
          onExitSearch();
          setActiveView('directions');

          if (startPoint.type === 'automatic') {
            setRouteStartSource('current');
            setRouteErrorMessage(null);
            // Calendar GO should always start from the user's live location coordinates.
            setStartBuilding(null);
            setStartLocationSnapshot(startPoint.coordinates);
          } else {
            setStartBuilding(null);
            setStartLocationSnapshot(null);
            setRouteStartSource('manual');
            setRouteErrorMessage(getManualStartReasonMessage(startPoint.reason));
          }

          snapToDirectionsPanel(DIRECTIONS_PANEL_SNAP_POINT);
          return null;
        } catch {
          return CALENDAR_LOCATION_NOT_FOUND_MESSAGE;
        }
      },
      [onExitSearch, passSelectedBuilding, snapToDirectionsPanel],
    );

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
      const selectedBuildingId = selectedBuilding?.id ?? null;
      const didSelectedBuildingChange =
        selectedBuildingId !== previousSelectedBuildingIdRef.current;
      previousSelectedBuildingIdRef.current = selectedBuildingId;

      if (activeView !== 'directions') return;
      if (!selectedBuilding) return;
      if (selectedBuilding.id === startBuilding?.id) return;
      if (!didSelectedBuildingChange && destinationBuilding) return;

      setDestinationBuilding(selectedBuilding);
    }, [selectedBuilding, activeView, startBuilding?.id, destinationBuilding]);

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
    const hasAvailableShuttlePlan = Boolean(
      travelMode === 'shuttle' &&
      shuttlePlan?.isServiceAvailable &&
      shuttlePlan.nextDepartureInMinutes !== null &&
      shuttlePlan.preShuttleWalk?.origin &&
      shuttlePlan.preShuttleWalk.destination &&
      shuttlePlan.shuttleRide?.origin &&
      shuttlePlan.shuttleRide.destination &&
      shuttlePlan.postShuttleWalk?.origin &&
      shuttlePlan.postShuttleWalk.destination,
    );
    const routeRequestMode: DirectionsTravelMode = toDirectionsTravelMode(travelMode);

    useEffect(() => {
      const shouldComputeShuttlePlan =
        (activeView === 'directions' || activeView === 'shuttle-schedule') &&
        travelMode === 'shuttle';

      const canComputeShuttlePlan =
        shouldComputeShuttlePlan && startCampus !== null && destinationCampus !== null;
      if (canComputeShuttlePlan) {
        setShuttlePlan(
          buildShuttlePlan({
            startCampus,
            destinationCampus,
            startCoords: startCoords ?? null,
            destinationCoords: destinationCoords ?? null,
            now: getShuttlePlanningDate(new Date()),
          }),
        );
        return;
      }

      setShuttlePlan(null);
    }, [activeView, destinationCampus, destinationCoords, startCampus, startCoords, travelMode]);

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
      const routeLoadDecision = getRouteLoadDecision({
        activeView,
        travelMode,
        hasAvailableShuttlePlan,
        destinationCoords,
        startCoords,
        startBuildingId: startBuilding?.id,
        destinationBuildingId: destinationBuilding?.id,
      });

      if (routeLoadDecision.action === 'skip') return;
      if (routeLoadDecision.action === 'reset') {
        resetRouteState(routeLoadDecision.message ?? null);
        return;
      }

      let cancelled = false;

      const loadRoute = async () => {
        setIsRouteLoading(true);
        setRouteErrorMessage(null);
        try {
          const route =
            travelMode === 'shuttle' && shuttlePlan
              ? await fetchShuttleCompositeDirections(shuttlePlan)
              : await fetchOutdoorDirections({
                  origin: routeLoadDecision.origin,
                  destination: routeLoadDecision.destination,
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
          passOutdoorRoute(
            toOutdoorRouteOverlay(
              route,
              routeLoadDecision.origin,
              routeLoadDecision.destination,
              toRouteOverlayMode(travelMode),
            ),
          );
        } catch (error) {
          if (cancelled) return;
          console.warn('Failed to fetch outdoor directions', error);
          resetRouteState(getRouteErrorMessage(error));
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
      hasAvailableShuttlePlan,
      passOutdoorRoute,
      resetRouteState,
      routeRequestMode,
      routeRetryNonce,
      shuttlePlan,
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
      openCalendarEventsSlider: (calendarIds?: string[]) => {
        const normalizedIds = [...new Set((calendarIds ?? selectedCalendarIds).filter(Boolean))];
        if (normalizedIds.length === 0) {
          openCalendarSelectionSlider();
          return;
        }
        showUpcomingClassesSlider(normalizedIds);
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
          {renderBottomSheetContent({
            isSearchActive,
            calendarSliderMode,
            isInternalSearch,
            selectedCalendarIds,
            handleReselectCalendars,
            handleCloseUpcomingClassesSlider,
            handleCloseCalendarSelectionSlider,
            showUpcomingClassesSlider,
            buildings,
            handleInternalSearch,
            closeSearchBuilding,
            openCalendarSelectionAfterConnect,
            handleCalendarGoFromSearch,
            calendarGoErrorMessage,
            activeView,
            selectedBuilding,
            closeSheet,
            showDirections,
            currentBuilding,
            userLocation,
            destinationBuilding,
            routeTransitSteps,
            showDirectionsPanel,
            startBuilding,
            shuttlePlan,
            navigationSummary,
            endNavigation,
            isCrossCampusRoute,
            isRouteLoading,
            routeErrorMessage,
            routeDistanceText,
            routeDurationText,
            routeDurationSeconds,
            travelMode,
            canStartNavigationFromCurrentLocation,
            setSearchFor,
            setTravelMode,
            handleDirectionsGo,
            showShuttleSchedule,
            handleRetryRoute,
          })}
        </BottomSheetView>
        {/**TO DO: Add in GoogleCalendar Bottom sheet view */}
      </BottomSheet>
    );
  },
);

export default BottomSlider;
