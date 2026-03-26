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
import type { RoomNode } from '../components/indoor/RoomList';
import IndoorDirectionDetails from './indoor/IndoorDirectionDetails';
import IndoorNavigationDetails from './indoor/IndoorNavigationDetails';
import { IndoorRoutePlannerMode } from '../types/SheetMode';
import type { SearchMode } from '../types/SearchMode';
import HybridDirectionsDetails from './HybridDirectionsDetails';
import { getIndoorBuildingKeyFromShape } from '../utils/indoor/buildingKeys';
import type { CrossBuildingRouteFlow } from '../types/CrossBuildingRoute';
import { buildCrossBuildingRouteFlow } from '../utils/indoor/crossBuildingRouteFlow';

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
  openIndoorNavigation: () => void;
  openIndoorDirections: () => void;
};

type SearchTarget = 'start' | 'destination' | null;

type MixedEndpoint =
  | { kind: 'room'; room: RoomNode }
  | { kind: 'building'; building: BuildingShape };

const isRoomEndpoint = (
  endpoint: MixedEndpoint | null,
): endpoint is Extract<MixedEndpoint, { kind: 'room' }> => endpoint?.kind === 'room';

const getEndpointLabel = (endpoint: MixedEndpoint | null): string | null => {
  if (!endpoint) return null;
  return endpoint.kind === 'room' ? endpoint.room.label : endpoint.building.name;
};

const getEndpointBuildingKey = (endpoint: MixedEndpoint | null): string | null => {
  if (!endpoint) return null;
  if (endpoint.kind === 'room') return endpoint.room.buildingKey;
  return getIndoorBuildingKeyFromShape(endpoint.building);
};

const isSameBuildingRoomPair = (start: MixedEndpoint | null, destination: MixedEndpoint | null) =>
  isRoomEndpoint(start) &&
  isRoomEndpoint(destination) &&
  start.room.buildingKey === destination.room.buildingKey;

const shouldShowHybridDirectionsPanel = (
  start: MixedEndpoint | null,
  destination: MixedEndpoint | null,
) => {
  if (!start || !destination) return false;
  if (start.kind === 'building' && destination.kind === 'building') return false;

  const startBuildingKey = getEndpointBuildingKey(start);
  const destinationBuildingKey = getEndpointBuildingKey(destination);

  if (start.kind === 'room' && destination.kind === 'room') {
    return startBuildingKey !== destinationBuildingKey;
  }

  let roomEndpoint: Extract<MixedEndpoint, { kind: 'room' }> | null = null;
  if (start.kind === 'room') {
    roomEndpoint = start;
  } else if (destination.kind === 'room') {
    roomEndpoint = destination;
  }
  if (!roomEndpoint) return false;

  let otherBuildingKey: string | null = null;
  if (start.kind === 'building') {
    otherBuildingKey = startBuildingKey;
  } else if (destination.kind === 'building') {
    otherBuildingKey = destinationBuildingKey;
  }

  return roomEndpoint.room.buildingKey !== otherBuildingKey;
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
  onEnterBuilding: (building: BuildingShape) => void;
  isIndoor: boolean;
  enterIndoorView: () => void;
  onIndoorRouteChange?: (startId: string | null, endId: string | null) => void;
  indoorPathSteps: { icon: string; label: string }[];
  onPrevPathFloor?: () => void;
  onNextPathFloor?: () => void;
  onIndoorTravelModeChange?: (mode: 'walking' | 'disability') => void;
  onShowOutdoorMap?: () => void;
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

const getRouteErrorLogDetails = (error: unknown) => {
  if (error instanceof DirectionsServiceError) {
    return {
      name: error.name,
      code: error.code,
      message: error.message,
      providerStatus: error.providerStatus ?? null,
      providerMessage: error.providerMessage ?? null,
      requestUrl: error.requestUrl ?? null,
    };
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: 'Unknown route error',
    rawError: error,
  };
};

// ── Extracted view components ─────────────────────────────────────────────

const NavigationView = ({
  navigationSummary,
  endNavigation,
}: {
  navigationSummary: {
    arrivalValue: string;
    durationStat: { value: string; label: string };
    distanceStat: { value: string; label: string };
  } | null;
  endNavigation: () => void;
}) => (
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

const IndoorDirectionsView = ({
  startRoom,
  destinationRoom,
  indoorPathSteps,
  closeSheet,
  openSearchFor,
  setActiveView,
  clearSearchOptions,
  onTravelModeChange,
  selectedTravelMode,
}: {
  startRoom: string | null;
  destinationRoom: string | null;
  indoorPathSteps: { icon: string; label: string }[];
  closeSheet: () => void;
  openSearchFor: (target: SearchTarget) => void;
  setActiveView: React.Dispatch<React.SetStateAction<ViewType>>;
  clearSearchOptions?: () => void;
  onTravelModeChange?: (mode: 'walking' | 'disability') => void;
  selectedTravelMode?: IndoorRoutePlannerMode;
}) => (
  <IndoorDirectionDetails
    startRoom={startRoom}
    destinationRoom={destinationRoom}
    onClose={closeSheet}
    onPressStart={() => openSearchFor('start')}
    onPressDestination={() => openSearchFor('destination')}
    hasPath={indoorPathSteps.length > 0}
    onPressGo={() => setActiveView('indoor-navigation')}
    onClear={clearSearchOptions}
    onTravelModeChange={onTravelModeChange}
    selectedTravelMode={selectedTravelMode}
  />
);

const IndoorNavigationView = ({
  startRoom,
  destinationRoom,
  selectedBuilding,
  indoorPathSteps,
  closeSheet,
  setActiveView,
  onPrevPathFloor,
  onNextPathFloor,
  onBack,
  stageActionLabel,
  onStageAction,
}: {
  startRoom: string | null;
  destinationRoom: string | null;
  selectedBuilding: BuildingShape | null;
  indoorPathSteps: { icon: string; label: string }[];
  closeSheet: () => void;
  setActiveView: React.Dispatch<React.SetStateAction<ViewType>>;
  onPrevPathFloor?: () => void;
  onNextPathFloor?: () => void;
  onBack?: () => void;
  stageActionLabel?: string;
  onStageAction?: () => void;
}) => (
  <IndoorNavigationDetails
    startRoom={startRoom}
    destinationRoom={destinationRoom}
    buildingName={selectedBuilding?.name ?? undefined}
    pathSteps={indoorPathSteps}
    onBack={onBack ?? (() => setActiveView('indoor-directions'))}
    onClose={closeSheet}
    onPrevFloor={indoorPathSteps.length > 0 ? onPrevPathFloor : undefined}
    onNextFloor={indoorPathSteps.length > 0 ? onNextPathFloor : undefined}
    stageActionLabel={stageActionLabel}
    onStageAction={onStageAction}
  />
);

const HybridDirectionsView = ({
  startLabel,
  destinationLabel,
  closeSheet,
  clearSearchOptions,
  openSearchFor,
  indoorTravelMode,
  onIndoorTravelModeChange,
  outdoorTravelMode,
  onOutdoorTravelModeChange,
  onGo,
  errorMessage,
}: {
  startLabel: string | null;
  destinationLabel: string | null;
  closeSheet: () => void;
  clearSearchOptions?: () => void;
  openSearchFor: (target: SearchTarget) => void;
  indoorTravelMode: IndoorRoutePlannerMode;
  onIndoorTravelModeChange: (mode: IndoorRoutePlannerMode) => void;
  outdoorTravelMode: RoutePlannerMode;
  onOutdoorTravelModeChange: (mode: RoutePlannerMode) => void;
  onGo?: () => void;
  errorMessage?: string | null;
}) => (
  <HybridDirectionsDetails
    startLabel={startLabel}
    destinationLabel={destinationLabel}
    onClose={closeSheet}
    onClear={clearSearchOptions}
    onPressStart={() => openSearchFor('start')}
    onPressDestination={() => openSearchFor('destination')}
    selectedIndoorMode={indoorTravelMode}
    selectedOutdoorMode={outdoorTravelMode}
    onIndoorModeChange={onIndoorTravelModeChange}
    onOutdoorModeChange={onOutdoorTravelModeChange}
    onPressGo={onGo}
    errorMessage={errorMessage}
  />
);

type SearchContentProps = {
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
  searchMode: SearchMode;
  onSelectRoom: (room: RoomNode) => void;
};

const SearchContent = ({
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
  searchMode,
  onSelectRoom,
}: SearchContentProps) => {
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
      searchMode={searchMode}
      onSelectRoom={onSelectRoom}
    />
  );
};

const renderBottomSheetContent = (props: {
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
  searchMode: SearchMode;
  activeView: ViewType;
  selectedBuilding: BuildingShape | null;
  indoorNavigationBuilding: BuildingShape | null;
  closeSheet: () => void;
  showDirections: (building: BuildingShape, asDestination?: boolean) => void;
  onEnterBuilding: (building: BuildingShape) => void;
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
  openSearchFor: (target: SearchTarget) => void;
  setSearchFor: React.Dispatch<React.SetStateAction<SearchTarget>>;
  setTravelMode: React.Dispatch<React.SetStateAction<RoutePlannerMode>>;
  handleDirectionsGo: (mode: RoutePlannerMode) => void;
  showShuttleSchedule: () => void;
  handleRetryRoute: () => void;
  onSelectRoom: (room: RoomNode) => void;
  startRoom: string | null;
  destinationRoom: string | null;
  hybridStartLabel: string | null;
  hybridDestinationLabel: string | null;
  hybridErrorMessage: string | null;
  indoorNavigationStartLabel: string | null;
  indoorNavigationDestinationLabel: string | null;
  indoorPathSteps: { icon: string; label: string }[];
  setActiveView: React.Dispatch<React.SetStateAction<ViewType>>;
  onPrevPathFloor?: () => void;
  onNextPathFloor?: () => void;
  clearIndoorSearch?: () => void;
  indoorTravelMode: 'walking' | 'disability';
  setIndoorTravelMode: React.Dispatch<React.SetStateAction<'walking' | 'disability'>>;
  hybridOutdoorTravelMode: RoutePlannerMode;
  setHybridOutdoorTravelMode: React.Dispatch<React.SetStateAction<RoutePlannerMode>>;
  handleHybridGo?: () => void;
  indoorStageActionLabel?: string;
  onIndoorStageAction?: () => void;
  onIndoorNavigationBack?: () => void;
  directionStageActionLabel?: string;
  onDirectionStageAction?: () => void;
}) => {
  if (props.isSearchActive) {
    return <SearchContent {...props} />;
  }

  if (props.activeView === 'building') {
    return (
      <BuildingDetails
        selectedBuilding={props.selectedBuilding}
        onClose={props.closeSheet}
        onShowDirections={props.showDirections}
        currentBuilding={props.currentBuilding}
        userLocation={props.userLocation}
        onEnterBuilding={props.onEnterBuilding}
      />
    );
  }

  if (props.activeView === 'transit-plan') {
    return (
      <TransitPlanDetails
        destinationBuilding={props.destinationBuilding}
        routeTransitSteps={props.routeTransitSteps}
        onBack={props.showDirectionsPanel}
        onClose={props.closeSheet}
      />
    );
  }

  if (props.activeView === 'shuttle-schedule') {
    return (
      <ShuttleScheduleDetails
        startBuilding={props.startBuilding}
        destinationBuilding={props.destinationBuilding}
        shuttlePlan={props.shuttlePlan}
        onBack={props.showDirectionsPanel}
        onClose={props.closeSheet}
      />
    );
  }

  if (props.activeView === 'navigation') {
    return (
      <NavigationView
        navigationSummary={props.navigationSummary}
        endNavigation={props.endNavigation}
      />
    );
  }

  if (props.activeView === 'indoor-directions') {
    return (
      <IndoorDirectionsView
        startRoom={props.startRoom}
        destinationRoom={props.destinationRoom}
        indoorPathSteps={props.indoorPathSteps}
        closeSheet={props.closeSheet}
        openSearchFor={props.openSearchFor}
        setActiveView={props.setActiveView}
        clearSearchOptions={props.clearIndoorSearch}
        onTravelModeChange={props.setIndoorTravelMode}
        selectedTravelMode={props.indoorTravelMode}
      />
    );
  }

  if (props.activeView === 'hybrid-directions') {
    return (
      <HybridDirectionsView
        startLabel={props.hybridStartLabel}
        destinationLabel={props.hybridDestinationLabel}
        closeSheet={props.closeSheet}
        clearSearchOptions={props.clearIndoorSearch}
        openSearchFor={props.openSearchFor}
        indoorTravelMode={props.indoorTravelMode}
        onIndoorTravelModeChange={props.setIndoorTravelMode}
        outdoorTravelMode={props.hybridOutdoorTravelMode}
        onOutdoorTravelModeChange={props.setHybridOutdoorTravelMode}
        onGo={props.handleHybridGo}
        errorMessage={props.hybridErrorMessage}
      />
    );
  }

  if (props.activeView === 'indoor-navigation') {
    return (
      <IndoorNavigationView
        startRoom={props.indoorNavigationStartLabel}
        destinationRoom={props.indoorNavigationDestinationLabel}
        selectedBuilding={props.indoorNavigationBuilding}
        indoorPathSteps={props.indoorPathSteps}
        closeSheet={props.closeSheet}
        setActiveView={props.setActiveView}
        onPrevPathFloor={props.onPrevPathFloor}
        onNextPathFloor={props.onNextPathFloor}
        onBack={props.onIndoorNavigationBack}
        stageActionLabel={props.indoorStageActionLabel}
        onStageAction={props.onIndoorStageAction}
      />
    );
  }

  return (
    <DirectionDetails
      onClose={props.closeSheet}
      startBuilding={props.startBuilding}
      destinationBuilding={props.destinationBuilding}
      userLocation={props.userLocation}
      currentBuilding={props.currentBuilding}
      isCrossCampusRoute={props.isCrossCampusRoute}
      isRouteLoading={props.isRouteLoading}
      routeErrorMessage={props.routeErrorMessage}
      routeDistanceText={props.routeDistanceText}
      routeDurationText={props.routeDurationText}
      routeDurationSeconds={props.routeDurationSeconds}
      selectedTravelMode={props.travelMode}
      shuttlePlan={props.shuttlePlan}
      canStartNavigation={props.canStartNavigationFromCurrentLocation}
      onPressStart={() => props.openSearchFor('start')}
      onPressDestination={() => props.openSearchFor('destination')}
      onTravelModeChange={props.setTravelMode}
      onPressGo={props.handleDirectionsGo}
      onPressShuttleSchedule={props.showShuttleSchedule}
      onRetryRoute={props.handleRetryRoute}
      stageActionLabel={props.directionStageActionLabel}
      onStageAction={props.onDirectionStageAction}
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
      onEnterBuilding,
      isIndoor,
      enterIndoorView,
      onIndoorRouteChange,
      indoorPathSteps,
      onPrevPathFloor,
      onNextPathFloor,
      onIndoorTravelModeChange,
      onShowOutdoorMap,
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

    const [startEndpoint, setStartEndpoint] = useState<MixedEndpoint | null>(null);
    const [destinationEndpoint, setDestinationEndpoint] = useState<MixedEndpoint | null>(null);
    const [crossBuildingRouteFlow, setCrossBuildingRouteFlow] =
      useState<CrossBuildingRouteFlow | null>(null);
    const [hybridRouteErrorMessage, setHybridRouteErrorMessage] = useState<string | null>(null);
    const [routeOriginOverride, setRouteOriginOverride] = useState<LatLng | null>(null);
    const [routeDestinationOverride, setRouteDestinationOverride] = useState<LatLng | null>(null);
    const clearCrossBuildingRouteFlowState = useCallback(() => {
      setCrossBuildingRouteFlow(null);
      setHybridRouteErrorMessage(null);
      setRouteOriginOverride(null);
      setRouteDestinationOverride(null);
    }, []);

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

    const [startRoom, setStartRoom] = useState<string | null>(null);
    const [destinationRoom, setDestinationRoom] = useState<string | null>(null);
    const [indoorTravelMode, setIndoorTravelMode] = useState<'walking' | 'disability'>('walking');
    const [hybridOutdoorTravelMode, setHybridOutdoorTravelMode] =
      useState<RoutePlannerMode>('walking');

    useEffect(() => {
      onIndoorTravelModeChange?.(indoorTravelMode);
    }, [indoorTravelMode, onIndoorTravelModeChange]);

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
    const clearIndoorSearch = useCallback(() => {
      clearCrossBuildingRouteFlowState();
      setStartRoom(null);
      setDestinationRoom(null);
      setStartEndpoint(null);
      setDestinationEndpoint(null);
      setStartBuilding(null);
      setDestinationBuilding(null);
      setStartLocationSnapshot(null);
      setRouteStartSource('current');
      setHybridOutdoorTravelMode('walking');
      resetRouteState();

      onIndoorRouteChange?.(null, null);
    }, [clearCrossBuildingRouteFlowState, onIndoorRouteChange, resetRouteState]);
    const handleEnterBuilding = useCallback(
      (building: BuildingShape) => {
        closeSheet();

        enterIndoorView();
        onEnterBuilding(building);
      },
      [onEnterBuilding],
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

    const [searchFor, setSearchFor] = useState<SearchTarget>(null);
    const [calendarSliderMode, setCalendarSliderMode] = useState<'selection' | 'events' | null>(
      null,
    );
    const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
    const [calendarGoErrorMessage, setCalendarGoErrorMessage] = useState<string | null>(null);
    const isInternalSearch = searchFor !== null;
    const isGlobalSearch = mode === 'search';
    const isSearchActive = isInternalSearch || isGlobalSearch || calendarSliderMode !== null;
    const openSearchFor = useCallback(
      (target: SearchTarget) => {
        clearCrossBuildingRouteFlowState();
        setSearchFor(target);
      },
      [clearCrossBuildingRouteFlowState],
    );

    const resolveViewForSelections = useCallback(
      (nextStart: MixedEndpoint | null, nextDestination: MixedEndpoint | null): ViewType => {
        if (shouldShowHybridDirectionsPanel(nextStart, nextDestination)) {
          return 'hybrid-directions';
        }

        if (isSameBuildingRoomPair(nextStart, nextDestination)) {
          return 'indoor-directions';
        }

        if (
          (nextStart?.kind === 'room' || nextDestination?.kind === 'room') &&
          (nextStart?.kind === 'building' || nextDestination?.kind === 'building')
        ) {
          return 'indoor-directions';
        }

        if (nextStart?.kind === 'building' || nextDestination?.kind === 'building') {
          return 'directions';
        }

        if (nextStart?.kind === 'room' || nextDestination?.kind === 'room') {
          return 'indoor-directions';
        }

        return activeView;
      },
      [activeView],
    );

    const syncIndoorRouteChange = useCallback(
      (nextStart: MixedEndpoint | null, nextDestination: MixedEndpoint | null) => {
        if (isRoomEndpoint(nextStart) && isRoomEndpoint(nextDestination)) {
          if (nextStart.room.buildingKey !== nextDestination.room.buildingKey) {
            onIndoorRouteChange?.(null, null);
            return;
          }

          onIndoorRouteChange?.(nextStart.room.id, nextDestination.room.id);
          return;
        }

        onIndoorRouteChange?.(null, null);
      },
      [onIndoorRouteChange],
    );

    const internalSearchMode = useMemo<SearchMode>(() => {
      if (!isInternalSearch) {
        return isIndoor ? 'rooms' : 'buildings';
      }

      if (activeView === 'hybrid-directions') {
        return 'mixed';
      }

      if (activeView === 'indoor-directions') {
        let oppositeEndpoint: MixedEndpoint | null = null;
        if (searchFor === 'start') {
          oppositeEndpoint = destinationEndpoint;
        } else if (searchFor === 'destination') {
          oppositeEndpoint = startEndpoint;
        }

        return isRoomEndpoint(oppositeEndpoint) ? 'mixed' : 'rooms';
      }

      return 'buildings';
    }, [activeView, destinationEndpoint, isIndoor, isInternalSearch, searchFor, startEndpoint]);

    const applySelectionView = useCallback(
      (nextStart: MixedEndpoint | null, nextDestination: MixedEndpoint | null) => {
        const nextView = resolveViewForSelections(nextStart, nextDestination);
        setActiveView(nextView);
        syncIndoorRouteChange(nextStart, nextDestination);

        if (nextView === 'directions') {
          snapToDirectionsPanel(DIRECTIONS_PANEL_SNAP_POINT);
        }
      },
      [resolveViewForSelections, snapToDirectionsPanel, syncIndoorRouteChange],
    );

    const handleSelectRoom = useCallback(
      (room: RoomNode) => {
        setHybridRouteErrorMessage(null);
        const nextEndpoint: MixedEndpoint = { kind: 'room', room };
        const nextStart = searchFor === 'start' ? nextEndpoint : startEndpoint;
        const nextDestination = searchFor === 'destination' ? nextEndpoint : destinationEndpoint;

        if (searchFor === 'start') {
          setStartRoom(room.label);
          setStartBuilding(null);
          setStartEndpoint(nextEndpoint);
        } else {
          setDestinationRoom(room.label);
          setDestinationBuilding(null);
          setDestinationEndpoint(nextEndpoint);
        }
        setSearchFor(null);
        onExitSearch();
        setCalendarSliderMode(null);
        applySelectionView(nextStart, nextDestination);
      },
      [applySelectionView, destinationEndpoint, onExitSearch, searchFor, startEndpoint],
    );

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
      clearCrossBuildingRouteFlowState();
      setHybridOutdoorTravelMode('walking');
      setTravelMode('walking');
      setRouteStartSource('current');
      setStartRoom(null);
      setDestinationRoom(null);
      onIndoorRouteChange?.(null, null);
      if (asDestination) {
        // Walking figure: building is destination, start is current location
        setStartBuilding(currentBuilding ?? null);
        setStartLocationSnapshot(currentBuilding ? null : userLocation);
        setDestinationBuilding(building);
        setStartEndpoint(currentBuilding ? { kind: 'building', building: currentBuilding } : null);
        setDestinationEndpoint({ kind: 'building', building });
      } else {
        // "Set as starting point" button: building is start
        setRouteStartSource('manual');
        setStartBuilding(building);
        setStartLocationSnapshot(null);
        setDestinationBuilding(null);
        setStartEndpoint({ kind: 'building', building });
        setDestinationEndpoint(null);
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
      clearCrossBuildingRouteFlowState();
      setActiveView('building');
      setSearchFor(null);
      setCalendarSliderMode(null);
      setCalendarGoErrorMessage(null);
      setTravelMode('walking');
      setShuttlePlan(null);
      setRouteStartSource('current');
      setStartLocationSnapshot(null);
      setStartBuilding(null);
      setDestinationBuilding(null);
      setStartEndpoint(null);
      setDestinationEndpoint(null);
      setStartRoom(null);
      setDestinationRoom(null);
      setHybridOutdoorTravelMode('walking');
      resetRouteState();
      onIndoorRouteChange?.(null, null);
      passSelectedBuilding(null);
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
      clearCrossBuildingRouteFlowState();
      setHybridOutdoorTravelMode('walking');
      passSelectedBuilding(chosenBuilding);

      //SET START BUILDING SHOULD BE WHERE USER IS CURRENTLY POSITION. (FOR FUTURE USES)
      setStartBuilding(currentBuilding ?? null);
      setStartLocationSnapshot(currentBuilding ? null : userLocation);
      setDestinationBuilding(chosenBuilding);
      setStartEndpoint(currentBuilding ? { kind: 'building', building: currentBuilding } : null);
      setDestinationEndpoint({ kind: 'building', building: chosenBuilding });
      setStartRoom(null);
      setDestinationRoom(null);
      setTravelMode('walking');
      setRouteStartSource('current');
      setActiveView('directions');
      onIndoorRouteChange?.(null, null);
      onExitSearch();
      snapToDirectionsPanel(DIRECTIONS_PANEL_SNAP_POINT);
    };

    const handleUpcomingClassPress = useCallback(
      async (event: GoogleCalendarEventItem): Promise<string | null> => {
        try {
          clearCrossBuildingRouteFlowState();
          const resolved = await resolveCalendarRouteLocation(event.location);
          if (resolved.type === 'error') {
            return resolved.message;
          }

          const { destinationBuilding: resolvedDestinationBuilding, startPoint } = resolved.value;
          passSelectedBuilding(resolvedDestinationBuilding);
          setDestinationBuilding(resolvedDestinationBuilding);
          setDestinationEndpoint({ kind: 'building', building: resolvedDestinationBuilding });
          setStartEndpoint(null);
          setStartRoom(null);
          setDestinationRoom(null);
          onIndoorRouteChange?.(null, null);
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
      [clearCrossBuildingRouteFlowState, onExitSearch, passSelectedBuilding, snapToDirectionsPanel],
    );

    const handleInternalSearch = (building: BuildingShape) => {
      setHybridRouteErrorMessage(null);
      const nextEndpoint: MixedEndpoint = { kind: 'building', building };
      const nextStart = searchFor === 'start' ? nextEndpoint : startEndpoint;
      const nextDestination = searchFor === 'destination' ? nextEndpoint : destinationEndpoint;

      passSelectedBuilding(building);

      if (searchFor === 'start') {
        setRouteStartSource('manual');
        setStartBuilding(building);
        setStartLocationSnapshot(null);
        setStartRoom(building.name);
        setStartEndpoint(nextEndpoint);
      } else {
        setDestinationBuilding(building);
        setDestinationRoom(building.name);
        setDestinationEndpoint(nextEndpoint);
      }

      setSearchFor(null);
      onExitSearch();
      setCalendarSliderMode(null);
      applySelectionView(nextStart, nextDestination);
    };

    const handleHybridGo = useCallback(() => {
      setHybridRouteErrorMessage(null);

      if (
        !isRoomEndpoint(startEndpoint) ||
        !isRoomEndpoint(destinationEndpoint) ||
        startEndpoint.room.buildingKey === destinationEndpoint.room.buildingKey
      ) {
        setHybridRouteErrorMessage(
          'Choose two rooms in different buildings to start a staged cross-building route.',
        );
        return;
      }

      const result = buildCrossBuildingRouteFlow({
        startRoom: startEndpoint.room,
        destinationRoom: destinationEndpoint.room,
        buildings,
        indoorTravelMode,
        outdoorMode: hybridOutdoorTravelMode,
      });

      if (!result.ok) {
        setHybridRouteErrorMessage(result.message);
        return;
      }

      const { flow } = result;
      clearCrossBuildingRouteFlowState();
      resetRouteState();
      setCrossBuildingRouteFlow(flow);
      setTravelMode(flow.outdoorMode);
      setRouteStartSource('manual');
      setStartLocationSnapshot(null);
      setStartBuilding(flow.originBuilding);
      setDestinationBuilding(flow.destinationBuilding);
      passSelectedBuilding(flow.originBuilding);
      enterIndoorView();
      onEnterBuilding(flow.originBuilding);
      onIndoorRouteChange?.(flow.startRoomEndpoint.id, flow.originTransferPoint.accessNodeId);
      setActiveView('indoor-navigation');
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(SHEET_INDEX_EXPANDED);
      });
    }, [
      buildings,
      clearCrossBuildingRouteFlowState,
      destinationEndpoint,
      enterIndoorView,
      hybridOutdoorTravelMode,
      indoorTravelMode,
      onEnterBuilding,
      onIndoorRouteChange,
      passSelectedBuilding,
      resetRouteState,
      startEndpoint,
    ]);

    const handleContinueToOutdoorDirections = useCallback(() => {
      if (!crossBuildingRouteFlow || crossBuildingRouteFlow.currentStage !== 'origin_indoor') {
        return;
      }

      setCrossBuildingRouteFlow({
        ...crossBuildingRouteFlow,
        currentStage: 'outdoor',
      });
      setTravelMode(crossBuildingRouteFlow.outdoorMode);
      setRouteStartSource('manual');
      setStartLocationSnapshot(null);
      setStartBuilding(crossBuildingRouteFlow.originBuilding);
      setDestinationBuilding(crossBuildingRouteFlow.destinationBuilding);
      setRouteOriginOverride(crossBuildingRouteFlow.originTransferPoint.outdoorCoords);
      setRouteDestinationOverride(crossBuildingRouteFlow.destinationTransferPoint.outdoorCoords);
      onIndoorRouteChange?.(null, null);
      resetRouteState();
      onShowOutdoorMap?.();
      setActiveView('directions');
    }, [crossBuildingRouteFlow, onIndoorRouteChange, onShowOutdoorMap, resetRouteState]);

    const handleEnterDestinationBuilding = useCallback(() => {
      if (!crossBuildingRouteFlow || crossBuildingRouteFlow.currentStage !== 'outdoor') {
        return;
      }

      setCrossBuildingRouteFlow({
        ...crossBuildingRouteFlow,
        currentStage: 'destination_indoor',
      });
      setRouteOriginOverride(null);
      setRouteDestinationOverride(null);
      resetRouteState();
      passSelectedBuilding(crossBuildingRouteFlow.destinationBuilding);
      enterIndoorView();
      onEnterBuilding(crossBuildingRouteFlow.destinationBuilding);
      onIndoorRouteChange?.(
        crossBuildingRouteFlow.destinationTransferPoint.accessNodeId,
        crossBuildingRouteFlow.destinationRoomEndpoint.id,
      );
      setActiveView('indoor-navigation');
      requestAnimationFrame(() => {
        sheetRef.current?.snapToIndex(SHEET_INDEX_EXPANDED);
      });
    }, [
      crossBuildingRouteFlow,
      enterIndoorView,
      onEnterBuilding,
      onIndoorRouteChange,
      passSelectedBuilding,
      resetRouteState,
    ]);

    const handleCrossBuildingIndoorBack = useCallback(() => {
      if (!crossBuildingRouteFlow) {
        setActiveView('indoor-directions');
        return;
      }

      clearCrossBuildingRouteFlowState();
      onIndoorRouteChange?.(null, null);
      resetRouteState();
      setActiveView('hybrid-directions');
    }, [clearCrossBuildingRouteFlowState, crossBuildingRouteFlow, onIndoorRouteChange, resetRouteState]);

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
      if (routeOriginOverride) return routeOriginOverride;
      if (startBuilding) return centroidOfPolygons(startBuilding.polygons);
      if (startLocationSnapshot) return startLocationSnapshot;
      if (currentBuilding) return centroidOfPolygons(currentBuilding.polygons);
      return userLocation;
    }, [currentBuilding, routeOriginOverride, startBuilding, startLocationSnapshot, userLocation]);

    const destinationCoords = useMemo(() => {
      if (routeDestinationOverride) return routeDestinationOverride;
      if (!destinationBuilding) return null;
      return centroidOfPolygons(destinationBuilding.polygons);
    }, [destinationBuilding, routeDestinationOverride]);

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
          console.warn('Failed to fetch outdoor directions', getRouteErrorLogDetails(error));
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
      openIndoorDirections: () => {
        setActiveView(
          shouldShowHybridDirectionsPanel(startEndpoint, destinationEndpoint)
            ? 'hybrid-directions'
            : 'indoor-directions',
        );
        sheetRef.current?.snapToIndex(SHEET_INDEX_EXPANDED);
      },
      openIndoorNavigation: () => {
        setActiveView('indoor-navigation');
        sheetRef.current?.snapToIndex(SHEET_INDEX_EXPANDED);
      },
    }));

    const hybridStartLabel = getEndpointLabel(startEndpoint) ?? startRoom;
    const hybridDestinationLabel = getEndpointLabel(destinationEndpoint) ?? destinationRoom;
    const indoorNavigationBuilding =
      crossBuildingRouteFlow?.currentStage === 'destination_indoor'
        ? crossBuildingRouteFlow.destinationBuilding
        : crossBuildingRouteFlow?.currentStage === 'origin_indoor'
          ? crossBuildingRouteFlow.originBuilding
          : selectedBuilding;
    const indoorNavigationStartLabel =
      crossBuildingRouteFlow?.currentStage === 'destination_indoor'
        ? `${crossBuildingRouteFlow.destinationBuilding.shortCode ?? crossBuildingRouteFlow.destinationBuilding.name} Entrance`
        : crossBuildingRouteFlow?.currentStage === 'origin_indoor'
          ? crossBuildingRouteFlow.startRoomEndpoint.label
          : startRoom;
    const indoorNavigationDestinationLabel =
      crossBuildingRouteFlow?.currentStage === 'destination_indoor'
        ? crossBuildingRouteFlow.destinationRoomEndpoint.label
        : crossBuildingRouteFlow?.currentStage === 'origin_indoor'
          ? `${crossBuildingRouteFlow.originBuilding.shortCode ?? crossBuildingRouteFlow.originBuilding.name} Exit`
          : destinationRoom;
    const indoorStageActionLabel =
      crossBuildingRouteFlow?.currentStage === 'origin_indoor'
        ? 'Continue to Outdoor Directions'
        : undefined;
    const directionStageActionLabel =
      crossBuildingRouteFlow?.currentStage === 'outdoor' ? 'Enter Building' : undefined;

    const renderedContent = renderBottomSheetContent({
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
      searchMode: internalSearchMode,
      activeView,
      selectedBuilding,
      indoorNavigationBuilding,
      closeSheet,
      showDirections,
      onEnterBuilding: handleEnterBuilding,
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
      openSearchFor,
      setSearchFor,
      setTravelMode,
      handleDirectionsGo,
      showShuttleSchedule,
      handleRetryRoute,
      onSelectRoom: handleSelectRoom,
      startRoom,
      destinationRoom,
      hybridStartLabel,
      hybridDestinationLabel,
      hybridErrorMessage: hybridRouteErrorMessage,
      indoorNavigationStartLabel,
      indoorNavigationDestinationLabel,
      indoorPathSteps,
      setActiveView,
      onPrevPathFloor,
      onNextPathFloor,
      clearIndoorSearch,
      indoorTravelMode,
      setIndoorTravelMode,
      hybridOutdoorTravelMode,
      setHybridOutdoorTravelMode,
      handleHybridGo,
      indoorStageActionLabel,
      onIndoorStageAction: handleContinueToOutdoorDirections,
      onIndoorNavigationBack: handleCrossBuildingIndoorBack,
      directionStageActionLabel,
      onDirectionStageAction: handleEnterDestinationBuilding,
    });
    const usesDirectScrollableContent = activeView === 'transit-plan' || isSearchActive;

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
        {usesDirectScrollableContent ? (
          renderedContent
        ) : (
          <BottomSheetView style={buildingDetailsStyles.container}>
            {renderedContent}
          </BottomSheetView>
        )}
      </BottomSheet>
    );
  },
);

export default BottomSlider;
