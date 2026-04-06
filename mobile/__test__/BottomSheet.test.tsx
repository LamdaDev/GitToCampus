import React, { createRef } from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import BottomSlider, { BottomSliderHandle } from '../src/components/BottomSheet';
import { BuildingShape } from '../src/types/BuildingShape';
import * as directionsService from '../src/services/googleDirections';
import { DirectionsServiceError } from '../src/types/Directions';
import * as shuttlePlannerService from '../src/services/shuttlePlanner';
import * as crossBuildingRouteFlowService from '../src/utils/indoor/crossBuildingRouteFlow';

const mockSnapToIndex = jest.fn();
const mockSnapToPosition = jest.fn();
const mockClose = jest.fn();
const mockResolveCalendarRouteLocation = jest.fn();
const mockGetManualStartReasonMessage = jest.fn();
const SNAP_INDEX_NAVIGATION_MAX = 1;
const SNAP_INDEX_PANEL = 2;
const SNAP_INDEX_EXPANDED = 3;

const mockBuildings: BuildingShape[] = [
  {
    polygons: [
      [
        { latitude: 45.458, longitude: -73.641 },
        { latitude: 45.459, longitude: -73.641 },
        { latitude: 45.459, longitude: -73.642 },
      ],
    ],
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    hotspots: {
      'Loyola Chapel': 'https://www.concordia.ca/hospitality/venues/loyola-chapel.html',
    },
    services: {
      'Concordia Multi-Faith and Spirituality Centre':
        'https://www.concordia.ca/equity/spirituality.html',
    },
    address: '7141 Sherbrooke West',
  },
  {
    polygons: [
      [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.58 },
      ],
    ],
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: '1515 Ste-Catherine W',
  },
];

const mockSameBuildingRoom = {
  id: 'room-h-811',
  label: 'H-811',
  floor: 8,
  buildingId: 'Hall',
  buildingKey: 'H' as const,
  campus: 'SGW' as const,
};

const mockOtherBuildingRoom = {
  id: 'room-ve-1615',
  label: 'VE-1.615',
  floor: 1,
  buildingId: 'VE',
  buildingKey: 'VE' as const,
  campus: 'LOYOLA' as const,
};

const mockSameBuildingDestinationRoom = {
  id: 'room-h-822',
  label: 'H-822',
  floor: 8,
  buildingId: 'Hall',
  buildingKey: 'H' as const,
  campus: 'SGW' as const,
};

const mockSameBuildingSearchResult: BuildingShape = {
  id: 'found-building-h',
  name: 'Hall Building',
  shortCode: 'H',
  polygons: [
    [
      { latitude: 45.4971, longitude: -73.5791 },
      { latitude: 45.4972, longitude: -73.5791 },
      { latitude: 45.4972, longitude: -73.5792 },
    ],
  ],
  campus: 'SGW',
  address: '1455 De Maisonneuve W',
};

const mockOtherBuildingSearchResult: BuildingShape = {
  id: 'found-building-ve',
  name: 'EV Building',
  shortCode: 'VE',
  polygons: [
    [
      { latitude: 45.497, longitude: -73.579 },
      { latitude: 45.498, longitude: -73.579 },
      { latitude: 45.498, longitude: -73.58 },
    ],
  ],
  campus: 'LOYOLA',
  address: '1515 Ste-Catherine W',
};

const defaultProps = {
  mode: 'detail' as const,
  revealSearchBar: jest.fn(),
  buildings: mockBuildings,
  onExitSearch: jest.fn(),
  passSelectedBuilding: jest.fn(),
  passOutdoorRoute: jest.fn(),
  userLocation: null,
  currentBuilding: null,
  onEnterBuilding: jest.fn(),
  isIndoor: false,
  enterIndoorView: jest.fn(),
  indoorPathSteps: [],
  onShowOutdoorMap: jest.fn(),
};

jest.mock('../src/services/googleDirections', () => ({
  fetchOutdoorDirections: jest.fn(),
}));

jest.mock('../src/services/shuttlePlanner', () => ({
  buildShuttlePlan: jest.fn(),
}));

jest.mock('../src/utils/indoor/crossBuildingRouteFlow', () => ({
  buildCrossBuildingRouteFlow: jest.fn(),
}));

jest.mock('../src/utils/calendarRouteLocation', () => ({
  resolveCalendarRouteLocation: (...args: unknown[]) => mockResolveCalendarRouteLocation(...args),
  getManualStartReasonMessage: (...args: unknown[]) => mockGetManualStartReasonMessage(...args),
}));

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  type MockProps = {
    children?: React.ReactNode;
  };

  return {
    __esModule: true,

    default: React.forwardRef(
      (
        props: {
          children: any;
          snapPoints?: string[];
          onClose?: () => void;
          onAnimate?: (from: number, to: number) => void;
        },
        ref: any,
      ) => {
        const React = require('react');
        const { View, TouchableOpacity, Text } = require('react-native');

        React.useImperativeHandle(ref, () => ({
          snapToIndex: mockSnapToIndex,
          snapToPosition: mockSnapToPosition,
          close: mockClose,
        }));

        return (
          <View testID="bottom-sheet">
            <Text testID="bottom-sheet-snap-points">
              {Array.isArray(props.snapPoints) ? props.snapPoints.join(',') : ''}
            </Text>
            <TouchableOpacity testID="trigger-on-close" onPress={props.onClose}>
              <Text>Trigger Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="trigger-on-animate-close"
              onPress={() => props.onAnimate?.(0, -1)}
            >
              <Text>Trigger Animate Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="trigger-on-animate-open"
              onPress={() => props.onAnimate?.(0, 0)}
            >
              <Text>Trigger Animate Open</Text>
            </TouchableOpacity>
            {props.children}
          </View>
        );
      },
    ),
    BottomSheetView: ({ children }: MockProps) => (
      <View testID="bottom-sheet-view">{children}</View>
    ),
  };
});

jest.mock('../src/components/BuildingDetails', () => {
  const { View, Button } = require('react-native');

  type MockProps = {
    onClose: () => void;
    onShowDirections?: (building: any, asDestination?: boolean) => void;
    selectedBuilding?: any;
  };

  const MockBuildingDetails: React.FC<MockProps> = ({
    onClose,
    onShowDirections,
    selectedBuilding,
  }) => (
    <View testID="building-details">
      <Button testID="close-button" title="Close" onPress={onClose} />
      <Button
        testID="on-show-directions"
        title="Directions"
        onPress={() => onShowDirections?.({ id: 'mock-building' })}
      />
      <Button
        testID="on-show-directions-as-destination"
        title="Directions as destination"
        onPress={() => onShowDirections?.(selectedBuilding, true)}
      />
    </View>
  );

  return MockBuildingDetails;
});

jest.mock('../src/components/PoiDetails', () => {
  const { View, Button, Text } = require('react-native');

  return ({ selectedPoi, onClose, onGetDirections }: any) => (
    <View testID="poi-details">
      <Text testID="poi-name">{selectedPoi?.name}</Text>
      <Button testID="poi-close-button" title="Close" onPress={onClose} />
      <Button
        testID="poi-get-directions-button"
        title="Get Directions"
        onPress={() => onGetDirections?.(selectedPoi)}
      />
    </View>
  );
});

jest.mock('../src/components/DirectionDetails', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  const React = require('react');

  return ({
    startBuilding,
    destinationBuilding,
    destinationLabel,
    destinationAddress,
    onClose,
    onPressStart,
    onPressDestination,
    onTravelModeChange,
    onPressShuttleSchedule,
    onPressTransitGo,
    onPressGo,
    canStartNavigation,
    isCrossCampusRoute,
    isRouteLoading,
    routeErrorMessage,
    routeDurationText,
    routeDistanceText,
    selectedTravelMode,
    shuttlePlan,
    onRetryRoute,
    stageActionLabel,
    onStageAction,
    onSwapLocations,
  }: any) =>
    (() => {
      const [selectedMode, setSelectedMode] = React.useState(
        'walking' as 'walking' | 'driving' | 'transit' | 'shuttle',
      );
      const hasRouteSummary = Boolean(routeDurationText && routeDistanceText);
      const showGoButton =
        hasRouteSummary &&
        (selectedMode === 'transit' || selectedMode === 'shuttle' || canStartNavigation);
      const showShuttleCard = selectedMode === 'shuttle';

      React.useEffect(() => {
        if (!selectedTravelMode) return;
        setSelectedMode(selectedTravelMode);
      }, [selectedTravelMode]);

      const handleSelectMode = (mode: 'walking' | 'driving' | 'transit' | 'shuttle') => {
        setSelectedMode(mode);
        onTravelModeChange?.(mode);
      };

      const handleGo = () => {
        if (!showGoButton) return;
        if (onPressGo) {
          onPressGo(selectedMode);
          return;
        }
        if (selectedMode === 'transit') onPressTransitGo?.();
        if (selectedMode === 'shuttle') onPressShuttleSchedule?.();
      };

      return (
        <View testID="direction-details">
          <Text testID="start-id">{startBuilding ? startBuilding.id : 'none'}</Text>
          <Text testID="destination-id">
            {destinationBuilding ? destinationBuilding.id : 'none'}
          </Text>
          <Text testID="destination-label-state">{destinationLabel ?? 'none'}</Text>
          <Text testID="destination-address-state">{destinationAddress ?? 'none'}</Text>
          <Text testID="cross-campus-state">{isCrossCampusRoute ? 'true' : 'false'}</Text>
          <Text testID="route-loading-state">{isRouteLoading ? 'true' : 'false'}</Text>
          <Text testID="route-error-state">{routeErrorMessage ?? 'none'}</Text>
          <TouchableOpacity testID="route-retry-button" onPress={onRetryRoute}>
            <Text>Retry Route</Text>
          </TouchableOpacity>
          <Text testID="route-summary-state">
            {routeDurationText && routeDistanceText
              ? `${routeDurationText} - ${routeDistanceText}`
              : 'none'}
          </Text>
          <Text testID="selected-travel-mode-state">{selectedMode}</Text>
          <Text testID="can-start-navigation-state">
            {canStartNavigation === false ? 'false' : 'true'}
          </Text>
          {showShuttleCard ? (
            <>
              <Text testID="shuttle-card-state">
                {!shuttlePlan
                  ? 'loading'
                  : shuttlePlan.isServiceAvailable
                    ? 'available'
                    : (shuttlePlan.message ?? 'unavailable')}
              </Text>
              <TouchableOpacity
                testID="shuttle-full-schedule-button"
                onPress={onPressShuttleSchedule}
              >
                <Text>Open shuttle schedule</Text>
              </TouchableOpacity>
            </>
          ) : null}
          <TouchableOpacity testID="close-directions-button" onPress={onClose}>
            <Text>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="press-start" onPress={onPressStart}>
            <Text>Start</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="press-destination" onPress={onPressDestination}>
            <Text>Destination</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="press-swap-locations" onPress={onSwapLocations}>
            <Text>Swap</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="transport-walk" onPress={() => handleSelectMode('walking')}>
            <Text>Walk</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="transport-car" onPress={() => handleSelectMode('driving')}>
            <Text>Car</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="transport-bus" onPress={() => handleSelectMode('transit')}>
            <Text>Bus</Text>
          </TouchableOpacity>
          <TouchableOpacity testID="transport-shuttle" onPress={() => handleSelectMode('shuttle')}>
            <Text>Shuttle</Text>
          </TouchableOpacity>
          {showGoButton ? (
            <TouchableOpacity testID="route-go-button" onPress={handleGo}>
              <Text>Go</Text>
            </TouchableOpacity>
          ) : null}
          {stageActionLabel ? (
            <TouchableOpacity testID="route-stage-action-button" onPress={onStageAction}>
              <Text>{stageActionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    })();
});

jest.mock('../src/components/TransitPlanDetails', () => {
  const { View, Text, TouchableOpacity } = require('react-native');

  return ({ routeTransitSteps, onBack, onClose }: any) => (
    <View testID="transit-plan-details">
      <Text testID="transit-steps-count">{(routeTransitSteps ?? []).length}</Text>
      <TouchableOpacity testID="transit-back-button" onPress={onBack}>
        <Text>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="transit-close-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/ShuttleScheduleDetails', () => {
  const { View, Text, TouchableOpacity } = require('react-native');

  return ({ onBack, onClose, shuttlePlan }: any) => (
    <View testID="shuttle-schedule-details">
      <Text testID="shuttle-schedule-state">
        {!shuttlePlan
          ? 'loading'
          : shuttlePlan.isServiceAvailable
            ? 'available'
            : (shuttlePlan.message ?? 'unavailable')}
      </Text>
      <TouchableOpacity testID="shuttle-schedule-back-button" onPress={onBack}>
        <Text>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="shuttle-schedule-close-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/SearchSheet', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({
    onPressBuilding,
    onCalendarConnected,
    onCalendarGoPress,
    calendarGoErrorMessage,
    onSelectRoom,
    searchMode,
    searchSessionId,
  }: any) => (
    <View testID="search-sheet">
      <Text testID="search-mode-state">{searchMode ?? 'buildings'}</Text>
      <Text testID="search-session-id-state">{searchSessionId ?? 0}</Text>
      <TouchableOpacity
        testID="press-building-in-search"
        onPress={() => onPressBuilding(mockSameBuildingSearchResult)}
      >
        <Text>Select</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="press-building-in-search-other"
        onPress={() => onPressBuilding(mockOtherBuildingSearchResult)}
      >
        <Text>Select Other Building</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="select-room-in-search"
        onPress={() => onSelectRoom?.(mockSameBuildingRoom)}
      >
        <Text>Select Room</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="select-room-in-search-other-building"
        onPress={() => onSelectRoom?.(mockOtherBuildingRoom)}
      >
        <Text>Select Other Room</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="select-room-in-search-same-building-other"
        onPress={() => onSelectRoom?.(mockSameBuildingDestinationRoom)}
      >
        <Text>Select Same Building Other Room</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="trigger-calendar-connected" onPress={() => onCalendarConnected?.()}>
        <Text>Calendar Connected</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="trigger-calendar-go" onPress={() => onCalendarGoPress?.()}>
        <Text>Calendar Go</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="trigger-calendar-go-with-event"
        onPress={() =>
          onCalendarGoPress?.({
            id: 'event-1',
            calendarId: 'calendar-1',
            title: 'User Interface Design',
            location: 'Hall Building 435',
            startsAt: Date.now() + 60_000,
          })
        }
      >
        <Text>Calendar Go Event</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="trigger-calendar-go-with-missing-location"
        onPress={() =>
          onCalendarGoPress?.({
            id: 'event-2',
            calendarId: 'calendar-1',
            title: 'Mystery Event',
            location: null,
            startsAt: Date.now() + 60_000,
          })
        }
      >
        <Text>Calendar Go Missing Location</Text>
      </TouchableOpacity>
      {calendarGoErrorMessage ? (
        <Text testID="calendar-go-error-message">{calendarGoErrorMessage}</Text>
      ) : null}
    </View>
  );
});

jest.mock('../src/components/HybridDirectionsDetails', () => {
  const { View, TouchableOpacity, Text } = require('react-native');

  return ({
    startLabel,
    destinationLabel,
    selectedIndoorMode,
    selectedOutdoorMode,
    onPressStart,
    onPressDestination,
    onIndoorModeChange,
    onOutdoorModeChange,
    onPressGo,
    onClose,
    onClear,
    errorMessage,
    summaryMessage,
    goDisabled,
  }: any) => (
    <View testID="hybrid-directions-details">
      <Text testID="hybrid-start-label">{startLabel ?? 'none'}</Text>
      <Text testID="hybrid-destination-label">{destinationLabel ?? 'none'}</Text>
      <Text testID="hybrid-indoor-mode-state">{selectedIndoorMode}</Text>
      <Text testID="hybrid-outdoor-mode-state">{selectedOutdoorMode}</Text>
      {errorMessage ? <Text testID="hybrid-error-message">{errorMessage}</Text> : null}
      {summaryMessage ? <Text testID="hybrid-summary-message">{summaryMessage}</Text> : null}
      <TouchableOpacity testID="hybrid-press-start" onPress={onPressStart}>
        <Text>Start</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hybrid-press-destination" onPress={onPressDestination}>
        <Text>Destination</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-indoor-walking"
        onPress={() => onIndoorModeChange('walking')}
      >
        <Text>Indoor Walk</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-indoor-disability"
        onPress={() => onIndoorModeChange('disability')}
      >
        <Text>Indoor Disability</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-outdoor-walking"
        onPress={() => onOutdoorModeChange('walking')}
      >
        <Text>Outdoor Walk</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-outdoor-driving"
        onPress={() => onOutdoorModeChange('driving')}
      >
        <Text>Outdoor Drive</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-outdoor-transit"
        onPress={() => onOutdoorModeChange('transit')}
      >
        <Text>Outdoor Transit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-outdoor-shuttle"
        onPress={() => onOutdoorModeChange('shuttle')}
      >
        <Text>Outdoor Shuttle</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="hybrid-go-button"
        disabled={goDisabled}
        onPress={goDisabled ? undefined : onPressGo}
      >
        <Text>Go</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hybrid-close-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="hybrid-clear-button" onPress={onClear}>
        <Text>Clear</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/indoor/IndoorNavigationDetails', () => {
  const { View, TouchableOpacity, Text } = require('react-native');

  return ({
    startRoom,
    destinationRoom,
    buildingName,
    onBack,
    onClose,
    stageActionLabel,
    onStageAction,
  }: any) => (
    <View testID="indoor-navigation-details">
      <Text testID="indoor-navigation-start-room">{startRoom ?? 'none'}</Text>
      <Text testID="indoor-navigation-destination-room">{destinationRoom ?? 'none'}</Text>
      <Text testID="indoor-navigation-building">{buildingName ?? 'none'}</Text>
      <TouchableOpacity testID="indoor-navigation-back-button" onPress={onBack}>
        <Text>Back</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="indoor-navigation-close-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      {stageActionLabel ? (
        <TouchableOpacity testID="indoor-stage-action-button" onPress={onStageAction}>
          <Text>{stageActionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});

jest.mock('../src/components/CalendarSelectionSlider', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ onDone }: any) => (
    <View testID="calendar-selection-slider">
      <TouchableOpacity
        testID="calendar-selection-done-button"
        onPress={() => onDone?.(['primary-calendar', 'winter-calendar'])}
      >
        <Text>Done</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/UpcomingClassesSlider', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ onReselectCalendars }: any) => (
    <View testID="upcoming-classes-slider">
      <TouchableOpacity testID="reselect-calendars-button" onPress={onReselectCalendars}>
        <Text>Reselect</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/indoor/IndoorDirectionDetails', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ onPressDestination, onPressStart, onClose, onPressGo, onClear }: any) => (
    <View testID="indoor-direction-details">
      <TouchableOpacity testID="indoor-press-start" onPress={onPressStart}>
        <Text>Start</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="indoor-press-destination" onPress={onPressDestination}>
        <Text>Destination</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="indoor-press-go" onPress={onPressGo}>
        <Text>Go</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="indoor-press-close" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="indoor-press-clear" onPress={onClear}>
        <Text>Clear</Text>
      </TouchableOpacity>
    </View>
  );
});

describe('BottomSheet', () => {
  const directionsServiceMock = directionsService as jest.Mocked<typeof directionsService>;
  const shuttlePlannerMock = shuttlePlannerService as jest.Mocked<typeof shuttlePlannerService>;
  const crossBuildingRouteFlowMock = crossBuildingRouteFlowService as jest.Mocked<
    typeof crossBuildingRouteFlowService
  >;
  const originalShuttleWeekdayDebug = process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY;
  const originalShuttleForcedPlanningTime =
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME;
  const pressAndFlush = async (node: any) => {
    await act(async () => {
      fireEvent.press(node);
      await Promise.resolve();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY;
    delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME;
    mockGetManualStartReasonMessage.mockReturnValue('');
    mockResolveCalendarRouteLocation.mockResolvedValue({
      type: 'success',
      value: {
        destinationBuilding: mockBuildings[1],
        startPoint: {
          type: 'automatic',
          coordinates: { latitude: 45.4585, longitude: -73.6412 },
          building: mockBuildings[0],
        },
        normalizedEventLocation: 'HALL BUILDING 435',
        rawEventLocation: 'Hall Building 435',
      },
    });
    directionsServiceMock.fetchOutdoorDirections.mockImplementation(
      () => new Promise(() => undefined),
    );
    shuttlePlannerMock.buildShuttlePlan.mockReturnValue({
      direction: 'LOYOLA_TO_SGW',
      pickup: null,
      dropoff: null,
      nextDepartures: [],
      nextDepartureDates: [],
      nextDepartureInMinutes: null,
      isServiceAvailable: false,
      message: 'Shuttle bus unavailable today. Try Public Transit.',
    });
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValue({
      ok: true,
      flow: {
        startRoomEndpoint: mockSameBuildingRoom,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        originBuilding: mockSameBuildingSearchResult,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: {
          buildingKey: 'H',
          campus: 'SGW',
          accessNodeId: 'Hall_F1_building_entry_exit_3',
          outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
          accessible: true,
        },
        destinationTransferPoint: {
          buildingKey: 'VE',
          campus: 'LOYOLA',
          accessNodeId: 'VE_F1_building_entry_exit_6',
          outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
          accessible: true,
        },
        outdoorMode: 'walking',
        currentStage: 'origin_indoor',
      },
    });
  });

  afterAll(() => {
    if (originalShuttleWeekdayDebug === undefined) {
      delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY;
    } else {
      process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY = originalShuttleWeekdayDebug;
    }
    if (originalShuttleForcedPlanningTime === undefined) {
      delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME;
    } else {
      process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME = originalShuttleForcedPlanningTime;
    }
    jest.useRealTimers();
  });

  test('handles null selectedBuilding safely', () => {
    const ref = React.createRef<any>();

    expect(() =>
      render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />),
    ).not.toThrow();
  });

  test('opens and closes the bottom sheet via Imperative Handler', () => {
    const ref = createRef<BottomSliderHandle>();

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
    );

    // Check open and close events have been called
    ref.current?.open();
    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_PANEL);

    // Check Close has been fired from child
    fireEvent.press(getByTestId('close-button'));
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders the BottomSheet components', () => {
    const ref = React.createRef<any>();

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
    );

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-view')).toBeTruthy();
  });

  test('renders BuildingDetails when a building is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
    );

    expect(getByTestId('building-details')).toBeTruthy();

    // Simulate pressing the close button
    fireEvent.press(getByTestId('close-button'));

    // The bottom sheet's close method should have been called
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders PoiDetails when a POI is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedPoi = {
      id: 'poi-1',
      name: 'Campus Coffee',
      category: 'cafe' as const,
      campus: 'SGW' as const,
      latitude: 45.4975,
      longitude: -73.5789,
      address: '1455 Test Ave',
    };

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={selectedPoi}
      />,
    );

    expect(getByTestId('poi-details')).toBeTruthy();
    expect(getByTestId('poi-name').props.children).toBe('Campus Coffee');
    expect(getByTestId('poi-get-directions-button')).toBeTruthy();
  });

  test('requests outdoor directions to the selected POI when Get Directions is pressed', async () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedPoi = {
      id: 'poi-2',
      name: 'Campus Snack Spot',
      category: 'depanneur' as const,
      campus: 'SGW' as const,
      latitude: 45.4975,
      longitude: -73.5775,
      address: '1500 Test Ave',
    };

    directionsServiceMock.fetchOutdoorDirections.mockResolvedValueOnce({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 800,
      distanceText: '800 m',
      durationSeconds: 600,
      durationText: '10 mins',
      bounds: null,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={selectedPoi}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('poi-get-directions-button'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('destination-label-state').props.children).toBe(selectedPoi.name);
      expect(getByTestId('destination-address-state').props.children).toBe('none');
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: {
            latitude: selectedPoi.latitude,
            longitude: selectedPoi.longitude,
          },
          mode: 'walking',
        }),
      );
      expect(getByTestId('route-summary-state').props.children).toContain('10 mins');
    });
  });

  test('shows a retryable route error for POI directions and retries with the same POI destination', async () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedPoi = {
      id: 'poi-3',
      name: 'Late Night Snack',
      category: 'depanneur' as const,
      campus: 'SGW' as const,
      latitude: 45.4968,
      longitude: -73.5769,
      address: '1600 Test Ave',
    };

    directionsServiceMock.fetchOutdoorDirections
      .mockRejectedValueOnce(new DirectionsServiceError('NETWORK_ERROR', 'Network down'))
      .mockResolvedValueOnce({
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distanceMeters: 950,
        distanceText: '950 m',
        durationSeconds: 720,
        durationText: '12 mins',
        bounds: null,
      });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={selectedPoi}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('poi-get-directions-button'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'Network issue while loading route. Check connection and retry.',
      );
    });

    fireEvent.press(getByTestId('route-retry-button'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBeGreaterThanOrEqual(
        2,
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenLastCalledWith(
        expect.objectContaining({
          destination: {
            latitude: selectedPoi.latitude,
            longitude: selectedPoi.longitude,
          },
          mode: 'walking',
        }),
      );
      expect(getByTestId('route-summary-state').props.children).toContain('12 mins');
    });
  });

  test('POI directions fall back to manual start selection when current location is unavailable', async () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedPoi = {
      id: 'poi-4',
      name: 'Study Snacks',
      category: 'depanneur' as const,
      campus: 'SGW' as const,
      latitude: 45.4959,
      longitude: -73.5772,
      address: '1705 Test Ave',
    };

    directionsServiceMock.fetchOutdoorDirections.mockResolvedValueOnce({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1100,
      distanceText: '1.1 km',
      durationSeconds: 780,
      durationText: '13 mins',
      bounds: null,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={selectedPoi}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    fireEvent.press(getByTestId('poi-get-directions-button'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'Set your start location to continue.',
      );
      expect(directionsServiceMock.fetchOutdoorDirections).not.toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('press-start'));
    await pressAndFlush(getByTestId('press-building-in-search'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: {
            latitude: selectedPoi.latitude,
            longitude: selectedPoi.longitude,
          },
          mode: 'walking',
        }),
      );
      expect(getByTestId('can-start-navigation-state').props.children).toBe('false');
      expect(getByTestId('route-summary-state').props.children).toContain('13 mins');
    });
  });

  test('changing selectedPoi alone does not override an active POI directions destination', async () => {
    const ref = createRef<BottomSliderHandle>();
    const firstPoi = {
      id: 'poi-5',
      name: 'Cafe One',
      category: 'cafe' as const,
      campus: 'SGW' as const,
      latitude: 45.4971,
      longitude: -73.5783,
      address: '1400 Test Ave',
    };
    const secondPoi = {
      id: 'poi-6',
      name: 'Cafe Two',
      category: 'cafe' as const,
      campus: 'SGW' as const,
      latitude: 45.4982,
      longitude: -73.5771,
      address: '1500 Test Ave',
    };

    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 900,
      distanceText: '900 m',
      durationSeconds: 660,
      durationText: '11 mins',
      bounds: null,
    });

    const { getByTestId, rerender } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={firstPoi}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('poi-get-directions-button'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: {
            latitude: firstPoi.latitude,
            longitude: firstPoi.longitude,
          },
          mode: 'walking',
        }),
      );
    });

    const initialCallCount = directionsServiceMock.fetchOutdoorDirections.mock.calls.length;

    rerender(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={secondPoi}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBe(initialCallCount);
    expect(getByTestId('destination-label-state').props.children).toBe(firstPoi.name);
  });

  test('selecting a POI while a building route is active does not replace the route destination', async () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedPoi = {
      id: 'poi-switch-1',
      name: 'Switch Cafe',
      category: 'cafe' as const,
      campus: 'SGW' as const,
      latitude: 45.4988,
      longitude: -73.5764,
      address: '1550 Test Ave',
    };

    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1000,
      distanceText: '1.0 km',
      durationSeconds: 720,
      durationText: '12 mins',
      bounds: null,
    });

    const { getByTestId, rerender } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({
          destination: expect.any(Object),
          mode: 'walking',
        }),
      );
    });

    const initialCallCount = directionsServiceMock.fetchOutdoorDirections.mock.calls.length;

    rerender(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        selectedPoi={selectedPoi}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBe(initialCallCount);
    expect(getByTestId('destination-id').props.children).toBe(mockBuildings[1].id);
  });

  test('renders DirectionDetails when onShowDirections is called', () => {
    const ref = React.createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
    );

    // Initially, DirectionDetails should not be visible
    expect(queryByTestId('direction-details')).toBeNull();

    // Press the onShowDirections button inside BuildingDetails
    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    // Now DirectionDetails should be rendered
    expect(getByTestId('direction-details')).toBeTruthy();

    // Optionally test closing DirectionDetails
    fireEvent.press(getByTestId('close-directions-button'));

    expect(mockClose).toHaveBeenCalled();
  });

  test('swap locations flips start and destination in directions view', async () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('start-id').props.children).toBe(mockBuildings[0].id);
    expect(getByTestId('destination-id').props.children).toBe(mockBuildings[1].id);

    await pressAndFlush(getByTestId('press-swap-locations'));

    expect(getByTestId('start-id').props.children).toBe(mockBuildings[1].id);
    expect(getByTestId('destination-id').props.children).toBe('none');
    expect(getByTestId('destination-label-state').props.children).toBe('My Location');
  });

  test('swap locations restores the original destination after swapping twice', async () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('press-swap-locations'));
    await pressAndFlush(getByTestId('press-swap-locations'));

    expect(getByTestId('start-id').props.children).toBe('none');
    expect(getByTestId('destination-id').props.children).toBe(mockBuildings[1].id);
  });

  test('swap locations clears destination when manual start has no resolvable source', async () => {
    mockResolveCalendarRouteLocation.mockResolvedValueOnce({
      type: 'success',
      value: {
        destinationBuilding: mockBuildings[1],
        startPoint: { type: 'manual', reason: 'location_permission_denied' },
        normalizedEventLocation: 'HALL BUILDING 435',
        rawEventLocation: 'Hall Building 435',
      },
    });

    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingShape | null>(
        mockBuildings[0],
      );

      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          mode={mode}
          selectedBuilding={selectedBuilding}
          passSelectedBuilding={setSelectedBuilding}
          onExitSearch={() => setMode('detail')}
        />
      );
    };

    const { getByTestId } = render(<SearchModeHarness />);
    fireEvent.press(getByTestId('trigger-calendar-go-with-event'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('destination-id').props.children).toBe(mockBuildings[1].id);
    });

    await pressAndFlush(getByTestId('press-swap-locations'));

    expect(getByTestId('start-id').props.children).toBe(mockBuildings[1].id);
    expect(getByTestId('destination-id').props.children).toBe('none');
    expect(getByTestId('destination-label-state').props.children).toBe('none');
  });

  test('swap locations falls back to user location when manual start has no building', async () => {
    mockResolveCalendarRouteLocation.mockResolvedValueOnce({
      type: 'success',
      value: {
        destinationBuilding: mockBuildings[1],
        startPoint: { type: 'manual', reason: 'location_permission_denied' },
        normalizedEventLocation: 'HALL BUILDING 435',
        rawEventLocation: 'Hall Building 435',
      },
    });

    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingShape | null>(
        mockBuildings[0],
      );

      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          mode={mode}
          userLocation={{ latitude: 45.4585, longitude: -73.6412 }}
          selectedBuilding={selectedBuilding}
          passSelectedBuilding={setSelectedBuilding}
          onExitSearch={() => setMode('detail')}
        />
      );
    };

    const { getByTestId } = render(<SearchModeHarness />);
    fireEvent.press(getByTestId('trigger-calendar-go-with-event'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('destination-id').props.children).toBe(mockBuildings[1].id);
    });

    await pressAndFlush(getByTestId('press-swap-locations'));

    expect(getByTestId('start-id').props.children).toBe(mockBuildings[1].id);
    expect(getByTestId('destination-id').props.children).toBe('none');
    expect(getByTestId('destination-label-state').props.children).toBe('My Location');
  });

  test('useEffect does NOT set destinationBuilding when selecting same building', () => {
    const ref = React.createRef<any>();
    const { getByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );
    const directionDetailsButton = getByTestId('on-show-directions');

    fireEvent.press(directionDetailsButton);

    // Re-select SAME building
    rerender(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />);

    const destinationBuildingID = getByTestId('destination-id').props.children;

    expect(destinationBuildingID).toBe('sgw-1');
  });

  test('setSnap calls snapToIndex via imperative handle', () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);
    ref.current?.setSnap(1);

    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_EXPANDED);
  });

  test('handleSheetAnimate calls revealSearchBar when the sheet closes', () => {
    const revealSearchBar = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        revealSearchBar={revealSearchBar}
      />,
    );
    fireEvent.press(getByTestId('trigger-on-animate-close'));

    expect(revealSearchBar).toHaveBeenCalled();
  });

  test('handleSheetAnimate does not call revealSearchBar for non-close transitions', () => {
    const revealSearchBar = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        revealSearchBar={revealSearchBar}
      />,
    );
    fireEvent.press(getByTestId('trigger-on-animate-open'));

    expect(revealSearchBar).not.toHaveBeenCalled();
  });

  test('handleSheetClose resets active view and clears route overlay', async () => {
    const passOutdoorRoute = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    expect(getByTestId('direction-details')).toBeTruthy();

    fireEvent.press(getByTestId('trigger-on-close'));

    await waitFor(() => {
      expect(getByTestId('building-details')).toBeTruthy();
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
    });
  });

  test('renders SearchSheet when mode is search', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('opens calendar selection slider after SearchSheet reports calendar connected', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
    expect(queryByTestId('search-sheet')).toBeNull();
  });

  test('calendar GO from search opens calendar selection when no calendars are selected', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-go'));

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
    expect(queryByTestId('search-sheet')).toBeNull();
  });

  test('calendar GO with a next-class event keeps destination and opens directions', async () => {
    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingShape | null>(
        mockBuildings[0],
      );

      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          mode={mode}
          selectedBuilding={selectedBuilding}
          passSelectedBuilding={setSelectedBuilding}
          onExitSearch={() => setMode('detail')}
        />
      );
    };

    const { getByTestId } = render(<SearchModeHarness />);

    fireEvent.press(getByTestId('trigger-calendar-go-with-event'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('destination-id').props.children).toBe('loy-1');
      expect(getByTestId('route-loading-state').props.children).toBe('true');
    });
  });

  test('calendar GO shows Unable to find route: Location Not Provided/Not Found when event location cannot be resolved', async () => {
    mockResolveCalendarRouteLocation.mockResolvedValueOnce({
      type: 'error',
      code: 'MISSING_EVENT_LOCATION',
      message: 'Unable to find route: Location Not Provided/Not Found',
    });

    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-go-with-missing-location'));

    await waitFor(() => {
      expect(getByTestId('calendar-go-error-message').props.children).toBe(
        'Unable to find route: Location Not Provided/Not Found',
      );
      expect(queryByTestId('direction-details')).toBeNull();
    });
  });

  test('done button on calendar selection slider opens upcoming classes slider', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));
    expect(getByTestId('calendar-selection-slider')).toBeTruthy();

    fireEvent.press(getByTestId('calendar-selection-done-button'));

    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();
    expect(queryByTestId('calendar-selection-slider')).toBeNull();
  });

  test('reselect calendars button returns from upcoming classes to calendar selection', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));
    fireEvent.press(getByTestId('calendar-selection-done-button'));
    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();

    fireEvent.press(getByTestId('reselect-calendars-button'));

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
    expect(queryByTestId('upcoming-classes-slider')).toBeNull();
  });

  test('global search mode hides building details even when a building is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        mode="search"
      />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('building-details')).toBeNull();
    expect(queryByTestId('direction-details')).toBeNull();
  });

  test('selecting a building in search mode calls passSelectedBuilding and onExitSearch', () => {
    const passSelectedBuilding = jest.fn();
    const onExitSearch = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        mode="search"
        passSelectedBuilding={passSelectedBuilding}
        onExitSearch={onExitSearch}
      />,
    );

    fireEvent.press(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(onExitSearch).toHaveBeenCalled();
  });

  test('pressing start in directions shows SearchSheet', async () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );
    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('pressing destination in directions shows SearchSheet', async () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-destination'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('internal building search reuses the standard search snap points instead of the directions snap profile', async () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    expect(getByTestId('bottom-sheet-snap-points').props.children).toContain('26%');

    fireEvent.press(getByTestId('press-start'));

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-snap-points').props.children).toBe('22%,29%,47%,75%');
  });

  test('reopening internal search after a building selection starts a fresh search session', async () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));

    const firstSearchSessionId = Number(getByTestId('search-session-id-state').props.children);

    await pressAndFlush(getByTestId('press-building-in-search'));
    fireEvent.press(getByTestId('press-destination'));

    const secondSearchSessionId = Number(getByTestId('search-session-id-state').props.children);

    expect(secondSearchSessionId).toBeGreaterThan(firstSearchSessionId);
  });

  test('selecting a building from internal search returns to directions view and keeps panel at 52%', async () => {
    const passSelectedBuilding = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passSelectedBuilding={passSelectedBuilding}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions'));
    fireEvent.press(getByTestId('press-start'));
    await pressAndFlush(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(getByTestId('direction-details')).toBeTruthy();
    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenCalledWith('52%');
    });
  });

  test('room to room across different buildings shows hybrid directions panel', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });

    expect(getByTestId('indoor-direction-details')).toBeTruthy();

    fireEvent.press(getByTestId('indoor-press-start'));
    expect(getByTestId('search-mode-state').props.children).toBe('mixed');
    await pressAndFlush(getByTestId('select-room-in-search'));

    expect(getByTestId('indoor-direction-details')).toBeTruthy();

    fireEvent.press(getByTestId('indoor-press-destination'));
    expect(getByTestId('search-mode-state').props.children).toBe('mixed');
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();
    expect(getByTestId('hybrid-start-label').props.children).toBe('H-811');
    expect(getByTestId('hybrid-destination-label').props.children).toBe('VE-1.615');
    expect(queryByTestId('indoor-direction-details')).toBeNull();
  });

  test('cross-building room to room GO starts the staged flow in origin indoor mode', async () => {
    const onIndoorRouteChange = jest.fn();
    const onEnterBuilding = jest.fn();
    const enterIndoorView = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        isIndoor={true}
        onIndoorRouteChange={onIndoorRouteChange}
        onEnterBuilding={onEnterBuilding}
        enterIndoorView={enterIndoorView}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        startRoom: mockSameBuildingRoom,
        destinationRoom: mockOtherBuildingRoom,
        indoorTravelMode: 'walking',
        outdoorMode: 'walking',
      }),
    );
    expect(enterIndoorView).toHaveBeenCalledTimes(1);
    expect(onEnterBuilding).toHaveBeenCalledWith(mockSameBuildingSearchResult);
    expect(onIndoorRouteChange).toHaveBeenLastCalledWith(
      'room-h-811',
      'Hall_F1_building_entry_exit_3',
    );
    expect(onIndoorRouteChange.mock.invocationCallOrder.at(-1)).toBeLessThan(
      enterIndoorView.mock.invocationCallOrder[0],
    );
    expect(onIndoorRouteChange.mock.invocationCallOrder.at(-1)).toBeLessThan(
      onEnterBuilding.mock.invocationCallOrder[0],
    );
    expect(getByTestId('indoor-navigation-details')).toBeTruthy();
    expect(getByTestId('indoor-stage-action-button')).toBeTruthy();
    expect(getByTestId('indoor-navigation-start-room').props.children).toBe('H-811');
    expect(getByTestId('indoor-navigation-destination-room').props.children).toBe('H Exit');
  });

  test('pressing the indoor stage CTA switches the staged flow to outdoor directions', async () => {
    const onIndoorRouteChange = jest.fn();
    const onShowOutdoorMap = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        isIndoor={true}
        onIndoorRouteChange={onIndoorRouteChange}
        onShowOutdoorMap={onShowOutdoorMap}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    await pressAndFlush(getByTestId('hybrid-go-button'));
    await pressAndFlush(getByTestId('indoor-stage-action-button'));

    expect(onShowOutdoorMap).toHaveBeenCalledTimes(1);
    expect(onIndoorRouteChange).toHaveBeenLastCalledWith(null, null);
    expect(getByTestId('direction-details')).toBeTruthy();
    expect(getByTestId('selected-travel-mode-state').props.children).toBe('walking');
    expect(getByTestId('route-stage-action-button')).toBeTruthy();
  });

  test('staged outdoor directions snap higher when the Enter Building action is available', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    await pressAndFlush(getByTestId('hybrid-go-button'));

    mockSnapToPosition.mockClear();

    await pressAndFlush(getByTestId('indoor-stage-action-button'));

    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenLastCalledWith('60%');
    });
  });

  test('pressing the outdoor stage CTA switches the staged flow to destination indoor mode', async () => {
    const onIndoorRouteChange = jest.fn();
    const onEnterBuilding = jest.fn();
    const enterIndoorView = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={null}
        isIndoor={true}
        onIndoorRouteChange={onIndoorRouteChange}
        onEnterBuilding={onEnterBuilding}
        enterIndoorView={enterIndoorView}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    await pressAndFlush(getByTestId('hybrid-go-button'));
    await pressAndFlush(getByTestId('indoor-stage-action-button'));
    await pressAndFlush(getByTestId('route-stage-action-button'));

    expect(onEnterBuilding).toHaveBeenLastCalledWith(mockOtherBuildingSearchResult);
    expect(onIndoorRouteChange).toHaveBeenLastCalledWith(
      'VE_F1_building_entry_exit_6',
      'room-ve-1615',
    );
    expect(enterIndoorView).toHaveBeenCalledTimes(2);
    expect(onIndoorRouteChange.mock.invocationCallOrder.at(-1)).toBeLessThan(
      onEnterBuilding.mock.invocationCallOrder.at(-1) ?? Number.POSITIVE_INFINITY,
    );
    expect(getByTestId('indoor-navigation-details')).toBeTruthy();
    expect(getByTestId('indoor-navigation-start-room').props.children).toBe('VE Entrance');
    expect(getByTestId('indoor-navigation-destination-room').props.children).toBe('VE-1.615');
  });

  test('selected hybrid outdoor mode is used for the staged outdoor leg', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    fireEvent.press(getByTestId('hybrid-outdoor-shuttle'));
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: true,
      flow: {
        startRoomEndpoint: mockSameBuildingRoom,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        originBuilding: mockSameBuildingSearchResult,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: {
          buildingKey: 'H',
          campus: 'SGW',
          accessNodeId: 'Hall_F1_building_entry_exit_3',
          outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
          accessible: true,
        },
        destinationTransferPoint: {
          buildingKey: 'VE',
          campus: 'LOYOLA',
          accessNodeId: 'VE_F1_building_entry_exit_6',
          outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
          accessible: true,
        },
        outdoorMode: 'shuttle',
        currentStage: 'origin_indoor',
      },
    });

    await pressAndFlush(getByTestId('hybrid-go-button'));
    await pressAndFlush(getByTestId('indoor-stage-action-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        outdoorMode: 'shuttle',
      }),
    );
    expect(getByTestId('selected-travel-mode-state').props.children).toBe('shuttle');
  });

  test('missing transfer metadata keeps the hybrid panel visible and shows an error', async () => {
    const ref = createRef<BottomSliderHandle>();
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: false,
      message: 'No building exit is configured yet for EV Building.',
    });
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });
    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));
    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();
    expect(getByTestId('hybrid-error-message').props.children).toBe(
      'No building exit is configured yet for EV Building.',
    );
    expect(queryByTestId('indoor-navigation-details')).toBeNull();
  });

  test('room to building across different buildings starts the staged flow with only an origin indoor leg', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: true,
      flow: {
        startRoomEndpoint: mockSameBuildingRoom,
        destinationRoomEndpoint: null,
        originBuilding: mockSameBuildingSearchResult,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: {
          buildingKey: 'H',
          campus: 'SGW',
          accessNodeId: 'Hall_F1_building_entry_exit_3',
          outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
          accessible: true,
        },
        destinationTransferPoint: null,
        outdoorMode: 'walking',
        currentStage: 'origin_indoor',
      },
    });

    await act(async () => {
      ref.current?.openIndoorDirections();
    });

    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));

    fireEvent.press(getByTestId('indoor-press-destination'));
    expect(getByTestId('search-mode-state').props.children).toBe('mixed');
    await pressAndFlush(getByTestId('press-building-in-search-other'));

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();
    expect(getByTestId('hybrid-start-label').props.children).toBe('H-811');
    expect(getByTestId('hybrid-destination-label').props.children).toBe('EV Building');
    expect(queryByTestId('indoor-direction-details')).toBeNull();

    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startRoom: mockSameBuildingRoom,
        destinationBuilding: mockOtherBuildingSearchResult,
      }),
    );
    expect(getByTestId('indoor-navigation-details')).toBeTruthy();
    expect(getByTestId('indoor-stage-action-button')).toBeTruthy();
  });

  test('building to room across different buildings starts directly in outdoor directions and keeps the destination indoor CTA', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: true,
      flow: {
        startRoomEndpoint: null,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        originBuilding: mockSameBuildingSearchResult,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: null,
        destinationTransferPoint: {
          buildingKey: 'VE',
          campus: 'LOYOLA',
          accessNodeId: 'VE_F1_building_entry_exit_6',
          outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
          accessible: true,
        },
        outdoorMode: 'walking',
        currentStage: 'outdoor',
      },
    });

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));
    await pressAndFlush(getByTestId('press-building-in-search'));
    fireEvent.press(getByTestId('press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();

    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startBuilding: mockSameBuildingSearchResult,
        destinationRoom: mockOtherBuildingRoom,
      }),
    );
    expect(getByTestId('direction-details')).toBeTruthy();
    expect(getByTestId('route-stage-action-button')).toBeTruthy();
    expect(queryByTestId('indoor-navigation-details')).toBeNull();
  });

  test('selecting a room from the global outdoor search opens hybrid directions and can start the outdoor-to-indoor flow', async () => {
    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          selectedBuilding={null}
          mode={mode}
          currentBuilding={null}
          userLocation={{ latitude: 45.497, longitude: -73.579 }}
          onExitSearch={() => setMode('detail')}
        />
      );
    };
    const { getByTestId } = render(<SearchModeHarness />);
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: true,
      flow: {
        startRoomEndpoint: null,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        originBuilding: null,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: null,
        destinationTransferPoint: {
          buildingKey: 'VE',
          campus: 'LOYOLA',
          accessNodeId: 'VE_F1_building_entry_exit_6',
          outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
          accessible: true,
        },
        outdoorMode: 'walking',
        currentStage: 'outdoor',
      },
    });

    expect(getByTestId('search-sheet')).toBeTruthy();
    await pressAndFlush(getByTestId('select-room-in-search-other-building'));

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();
    expect(getByTestId('hybrid-start-label').props.children).toBe('My Location');
    expect(getByTestId('hybrid-destination-label').props.children).toBe('VE-1.615');

    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startBuilding: null,
        destinationRoom: mockOtherBuildingRoom,
      }),
    );
    expect(getByTestId('direction-details')).toBeTruthy();
    expect(getByTestId('route-stage-action-button')).toBeTruthy();
  });

  test('room to room in the same building keeps the existing indoor directions panel', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} isIndoor={true} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
    });

    fireEvent.press(getByTestId('indoor-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));

    fireEvent.press(getByTestId('indoor-press-destination'));
    await pressAndFlush(getByTestId('select-room-in-search-same-building-other'));

    expect(getByTestId('indoor-direction-details')).toBeTruthy();
    expect(queryByTestId('hybrid-directions-details')).toBeNull();
  });

  test('building to building keeps the existing outdoor directions panel', async () => {
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));
    await pressAndFlush(getByTestId('press-building-in-search-other'));

    expect(getByTestId('direction-details')).toBeTruthy();
    expect(queryByTestId('hybrid-directions-details')).toBeNull();
  });

  test('snaps to expanded position when mode switches to search', () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="detail" />,
    );

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    jest.runAllTimers();
    expect(mockSnapToPosition).toHaveBeenCalledWith('75%');
    jest.useRealTimers();
  });

  test('switching to global search hides directions view and shows only search sheet', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));
    expect(getByTestId('direction-details')).toBeTruthy();

    rerender(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        mode="search"
      />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('direction-details')).toBeNull();
    expect(queryByTestId('building-details')).toBeNull();
  });

  test('useEffect sets destinationBuilding when selectedBuilding changes in directions view', () => {
    const { getByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[1]} />,
    );

    expect(getByTestId('destination-id').props.children).toBe('loy-1');
  });

  test('sets cross-campus flag when current and destination campuses differ', () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('true');
  });

  test('does not set cross-campus flag for same-campus routes', () => {
    const sameCampusCurrent: BuildingShape = { ...mockBuildings[0], campus: 'SGW' };

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={sameCampusCurrent}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('false');
  });

  test('does not set cross-campus flag when start campus is unknown', () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={null}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    expect(getByTestId('cross-campus-state').props.children).toBe('false');
  });

  test('cross-campus shuttle mode computes shuttle plan and exposes shuttle card content path', async () => {
    shuttlePlannerMock.buildShuttlePlan.mockReturnValueOnce({
      direction: 'LOYOLA_TO_SGW',
      pickup: null,
      dropoff: null,
      nextDepartures: ['9:15 AM', '9:30 AM'],
      nextDepartureDates: [],
      nextDepartureInMinutes: 3,
      isServiceAvailable: true,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    await waitFor(() => {
      expect(shuttlePlannerMock.buildShuttlePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          startCampus: 'LOYOLA',
          destinationCampus: 'SGW',
          startCoords: expect.any(Object),
        }),
      );
      expect(getByTestId('shuttle-card-state').props.children).toBe('available');
    });
  });

  test('shuttle mode routes map path through pickup, shuttle ride, and destination walk', async () => {
    const passOutdoorRoute = jest.fn();
    const shuttlePickupCoords = { latitude: 45.458317, longitude: -73.640225 };
    const shuttleDropoffCoords = { latitude: 45.497193, longitude: -73.578985 };
    const destinationCoords = {
      latitude: 45.49766666666667,
      longitude: -73.57933333333334,
    };

    directionsServiceMock.fetchOutdoorDirections
      .mockResolvedValueOnce({
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distanceMeters: 1200,
        distanceText: '1.2 km',
        durationSeconds: 840,
        durationText: '14 mins',
        bounds: null,
      })
      .mockResolvedValueOnce({
        polyline: 'walk-to-pickup',
        distanceMeters: 450,
        distanceText: '450 m',
        durationSeconds: 360,
        durationText: '6 mins',
        bounds: null,
      })
      .mockResolvedValueOnce({
        polyline: 'shuttle-ride',
        distanceMeters: 8200,
        distanceText: '8.2 km',
        durationSeconds: 1200,
        durationText: '20 mins',
        bounds: null,
      })
      .mockResolvedValueOnce({
        polyline: 'walk-to-destination',
        distanceMeters: 300,
        distanceText: '300 m',
        durationSeconds: 240,
        durationText: '4 mins',
        bounds: null,
      });
    shuttlePlannerMock.buildShuttlePlan.mockReturnValueOnce({
      direction: 'LOYOLA_TO_SGW',
      pickup: {
        id: 'loy-ad',
        campus: 'LOYOLA',
        name: 'Loyola Shuttle Stop (AD Building)',
        coords: shuttlePickupCoords,
      },
      dropoff: {
        id: 'sgw-hall',
        campus: 'SGW',
        name: 'SGW Shuttle Stop (Hall Building)',
        coords: shuttleDropoffCoords,
      },
      preShuttleWalk: {
        kind: 'pre_shuttle_walk',
        mode: 'walking',
        origin: { latitude: 45.458, longitude: -73.641 },
        destination: shuttlePickupCoords,
      },
      shuttleRide: {
        kind: 'shuttle_ride',
        mode: 'shuttle',
        origin: shuttlePickupCoords,
        destination: shuttleDropoffCoords,
      },
      postShuttleWalk: {
        kind: 'post_shuttle_walk',
        mode: 'walking',
        origin: shuttleDropoffCoords,
        destination: destinationCoords,
      },
      nextDepartures: ['10:15 AM', '10:30 AM'],
      nextDepartureDates: [],
      nextDepartureInMinutes: 2,
      isServiceAvailable: true,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalled();
    });

    const initialCallCount = directionsServiceMock.fetchOutdoorDirections.mock.calls.length;
    await pressAndFlush(getByTestId('transport-shuttle'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBe(
        initialCallCount + 3,
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenNthCalledWith(
        initialCallCount + 1,
        expect.objectContaining({
          mode: 'walking',
          destination: shuttlePickupCoords,
        }),
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenNthCalledWith(
        initialCallCount + 2,
        expect.objectContaining({
          mode: 'driving',
          origin: shuttlePickupCoords,
          destination: shuttleDropoffCoords,
        }),
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenNthCalledWith(
        initialCallCount + 3,
        expect.objectContaining({
          mode: 'walking',
          origin: shuttleDropoffCoords,
        }),
      );
      expect(passOutdoorRoute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          destination: destinationCoords,
          routeSegments: [
            expect.objectContaining({ encodedPolyline: 'walk-to-pickup', requiresWalking: true }),
            expect.objectContaining({ encodedPolyline: 'shuttle-ride', requiresWalking: false }),
            expect.objectContaining({
              encodedPolyline: 'walk-to-destination',
              requiresWalking: true,
            }),
          ],
        }),
      );
    });
  });

  test('opens shuttle schedule view from shuttle mode and returns to directions with back arrow', async () => {
    shuttlePlannerMock.buildShuttlePlan.mockReturnValue({
      direction: 'LOYOLA_TO_SGW',
      pickup: null,
      dropoff: null,
      nextDepartures: ['9:15 AM', '9:30 AM'],
      nextDepartureDates: [],
      nextDepartureInMinutes: 4,
      isServiceAvailable: true,
    });

    const { getByTestId, queryByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));
    await pressAndFlush(getByTestId('shuttle-full-schedule-button'));

    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenCalledWith('92%');
      expect(getByTestId('shuttle-schedule-details')).toBeTruthy();
      expect(getByTestId('shuttle-schedule-state').props.children).toBe('available');
      expect(queryByTestId('direction-details')).toBeNull();
    });

    fireEvent.press(getByTestId('shuttle-schedule-back-button'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(queryByTestId('shuttle-schedule-details')).toBeNull();
    });
  });

  test('same-campus shuttle mode shows unavailable shuttle card content path', async () => {
    const sameCampusCurrent: BuildingShape = { ...mockBuildings[0], campus: 'SGW' };
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={sameCampusCurrent}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    await waitFor(() => {
      expect(getByTestId('cross-campus-state').props.children).toBe('false');
      expect(getByTestId('shuttle-card-state').props.children).toBe(
        'Shuttle bus unavailable today. Try Public Transit.',
      );
      expect(shuttlePlannerMock.buildShuttlePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          startCampus: 'SGW',
          destinationCampus: 'SGW',
        }),
      );
    });
  });

  test('cross-campus shuttle keeps directions panel at 52% (same as walk/car)', async () => {
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await waitFor(() => {
      expect(getByTestId('cross-campus-state').props.children).toBe('true');
    });

    await pressAndFlush(getByTestId('transport-shuttle'));
    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenLastCalledWith('52%');
    });

    await pressAndFlush(getByTestId('transport-walk'));
    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenLastCalledWith('52%');
    });

    await pressAndFlush(getByTestId('transport-car'));
    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenLastCalledWith('52%');
    });
  });

  test('requests outdoor route and passes route overlay when directions are available', async () => {
    const passOutdoorRoute = jest.fn();
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValueOnce({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const buildingsWithPolygons: BuildingShape[] = [
      {
        ...mockBuildings[0],
        polygons: [
          [
            { latitude: 45.458, longitude: -73.641 },
            { latitude: 45.459, longitude: -73.641 },
            { latitude: 45.459, longitude: -73.642 },
          ],
        ],
      },
      {
        ...mockBuildings[1],
        polygons: [
          [
            { latitude: 45.497, longitude: -73.579 },
            { latitude: 45.498, longitude: -73.579 },
            { latitude: 45.498, longitude: -73.58 },
          ],
        ],
      },
    ];

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={buildingsWithPolygons[1]}
        currentBuilding={buildingsWithPolygons[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalled();
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'walking' }),
      );
      expect(passOutdoorRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
          start: expect.any(Object),
          destination: expect.any(Object),
        }),
      );
    });
  });

  test('requests driving then transit directions when car and bus transport are selected', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'walking' }),
      );
    });

    const initialCallCount = directionsServiceMock.fetchOutdoorDirections.mock.calls.length;

    await pressAndFlush(getByTestId('transport-car'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBeGreaterThan(
        initialCallCount,
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'driving' }),
      );
    });

    const carCallCount = directionsServiceMock.fetchOutdoorDirections.mock.calls.length;
    await pressAndFlush(getByTestId('transport-bus'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBeGreaterThan(
        carCallCount,
      );
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'transit' }),
      );
    });
  });

  test('opens transit plan as a separate sheet when GO is pressed in transit mode', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockImplementation(async (request: any) => ({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
      ...(request.mode === 'transit'
        ? {
            transitInstructions: [
              {
                id: 'transit-0-1',
                type: 'transit',
                title: 'Board the 12 bus',
              },
            ],
          }
        : {}),
    }));

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
    });

    await pressAndFlush(getByTestId('transport-bus'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenLastCalledWith(
        expect.objectContaining({ mode: 'transit' }),
      );
    });

    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(getByTestId('transit-plan-details')).toBeTruthy();
      expect(getByTestId('transit-steps-count').props.children).toBe(1);
    });

    fireEvent.press(getByTestId('transit-back-button'));
    expect(getByTestId('direction-details')).toBeTruthy();
  });

  test('shows loading state while waiting for directions response', async () => {
    let resolveRoute: ((value: any) => void) | undefined;
    directionsServiceMock.fetchOutdoorDirections.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRoute = resolve;
        }),
    );

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-loading-state').props.children).toBe('true');
    });

    await act(async () => {
      resolveRoute?.({
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distanceMeters: 1200,
        distanceText: '1.2 km',
        durationSeconds: 840,
        durationText: '14 mins',
        bounds: null,
      });
    });

    await waitFor(() => {
      expect(getByTestId('route-loading-state').props.children).toBe('false');
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
    });
  });

  test('clears route and skips fetch when start and destination are the same building', async () => {
    const passOutdoorRoute = jest.fn();

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    fireEvent.press(getByTestId('press-start'));
    fireEvent.press(getByTestId('press-building-in-search'));
    fireEvent.press(getByTestId('press-destination'));
    fireEvent.press(getByTestId('press-building-in-search'));

    await waitFor(() => {
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
      expect(directionsServiceMock.fetchOutdoorDirections).toHaveBeenCalled();
    });
  });

  test('clears route and warns when directions fetch fails', async () => {
    const passOutdoorRoute = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections.mockRejectedValueOnce(new Error('bad request'));

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith('Failed to fetch outdoor directions', {
        name: 'Error',
        message: 'bad request',
      });
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
      expect(getByTestId('route-error-state').props.children).toBe(
        'Unable to load route. Please try again.',
      );
    });

    warnSpy.mockRestore();
  });

  test('shows missing API key error when directions service reports MISSING_API_KEY', async () => {
    const passOutdoorRoute = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections.mockRejectedValueOnce(
      new DirectionsServiceError('MISSING_API_KEY', 'Missing key'),
    );

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'Google Directions API key is missing.',
      );
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
    });

    warnSpy.mockRestore();
  });

  test('shows no-route error when directions service reports NO_ROUTE', async () => {
    const passOutdoorRoute = jest.fn();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections.mockRejectedValueOnce(
      new DirectionsServiceError('NO_ROUTE', 'No route'),
    );

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        passOutdoorRoute={passOutdoorRoute}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'No route found for this start and destination.',
      );
      expect(passOutdoorRoute).toHaveBeenCalledWith(null);
    });

    warnSpy.mockRestore();
  });

  test('shows quota error when directions service reports OVER_QUERY_LIMIT', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections.mockRejectedValueOnce(
      new DirectionsServiceError('OVER_QUERY_LIMIT', 'Quota exceeded'),
    );

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'Routing service limit reached. Please wait and retry.',
      );
    });

    warnSpy.mockRestore();
  });

  test('retries route request after an error when retry is pressed', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    directionsServiceMock.fetchOutdoorDirections
      .mockRejectedValueOnce(new DirectionsServiceError('NETWORK_ERROR', 'Network down'))
      .mockResolvedValueOnce({
        polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
        distanceMeters: 1200,
        distanceText: '1.2 km',
        durationSeconds: 840,
        durationText: '14 mins',
        bounds: null,
      });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-error-state').props.children).toBe(
        'Network issue while loading route. Check connection and retry.',
      );
    });

    fireEvent.press(getByTestId('route-retry-button'));

    await waitFor(() => {
      expect(directionsServiceMock.fetchOutdoorDirections.mock.calls.length).toBeGreaterThanOrEqual(
        2,
      );
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
    });

    warnSpy.mockRestore();
  }, 15000);

  test('walking GO opens navigation summary and shows End Navigation button', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const { getByTestId, getByText, queryByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        userLocation={{ latitude: 45.4585, longitude: -73.6412 }}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
    });

    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(queryByTestId('direction-details')).toBeNull();
      expect(getByText('arrival')).toBeTruthy();
      expect(getByTestId('end-navigation-button')).toBeTruthy();
      expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_NAVIGATION_MAX);
    });
  });

  test('End Navigation returns to directions panel with the same selected route', async () => {
    const rafSpy = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });

    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        userLocation={{ latitude: 45.4585, longitude: -73.6412 }}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-go-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(getByTestId('end-navigation-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('end-navigation-button'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('destination-id').props.children).toBe('loy-1');
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
      expect(getByTestId('can-start-navigation-state').props.children).toBe('true');
      expect(mockSnapToPosition).toHaveBeenCalledWith('52%');
    });

    rafSpy.mockRestore();
  });

  test('manual start hides GO for walking and driving but keeps GO for transit', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
      transitInstructions: [{ id: 'step-1', type: 'transit', title: 'Bus' }],
    } as any);

    const { getByTestId, queryByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await waitFor(() => {
      expect(getByTestId('route-summary-state').props.children).toContain('14 mins');
      expect(getByTestId('route-go-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('press-start'));
    await pressAndFlush(getByTestId('press-building-in-search'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('can-start-navigation-state').props.children).toBe('false');
      expect(queryByTestId('route-go-button')).toBeNull();
    });

    fireEvent.press(getByTestId('transport-car'));
    expect(queryByTestId('route-go-button')).toBeNull();

    fireEvent.press(getByTestId('transport-bus'));
    expect(getByTestId('route-go-button')).toBeTruthy();
  });

  test('open(index > 1) uses the provided snap index directly', () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);

    ref.current?.open(3);

    expect(mockSnapToIndex).toHaveBeenCalledWith(3);
  });

  test('open() keeps directions view snapped at 52% instead of dropping down', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    ref.current?.open(0);

    await waitFor(() => {
      expect(mockSnapToPosition).toHaveBeenCalledWith('52%');
    });
  });

  test('imperative calendar slider handlers open events view and close back to search', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} mode="search" />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('upcoming-classes-slider')).toBeNull();

    await act(async () => {
      ref.current?.openCalendarEventsSlider(['calendar-1']);
      await Promise.resolve();
    });

    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();

    await act(async () => {
      ref.current?.closeCalendarSlider();
      await Promise.resolve();
    });

    expect(getByTestId('search-sheet')).toBeTruthy();
    expect(queryByTestId('upcoming-classes-slider')).toBeNull();
  });

  test('imperative calendar open reuses previously selected calendars when no ids are provided', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId, queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));
    expect(getByTestId('calendar-selection-slider')).toBeTruthy();

    fireEvent.press(getByTestId('calendar-selection-done-button'));
    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();

    await act(async () => {
      ref.current?.closeCalendarSlider();
      await Promise.resolve();
    });
    expect(getByTestId('search-sheet')).toBeTruthy();

    await act(async () => {
      ref.current?.openCalendarEventsSlider();
      await Promise.resolve();
    });

    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();
    expect(queryByTestId('calendar-selection-slider')).toBeNull();
  });

  test('formats long navigation duration with hour text in navigation summary', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 7260,
      durationText: '2 h 1 min',
      bounds: null,
    });

    const { getByTestId, getByText } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-summary-state').props.children).toContain('2 h 1 min');
    });

    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(getByText('2h 1m')).toBeTruthy();
    });
  });

  test('formats whole-hour navigation duration without minutes suffix', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 7200,
      durationText: '2 h',
      bounds: null,
    });

    const { getByTestId, getByText } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));

    await waitFor(() => {
      expect(getByTestId('route-summary-state').props.children).toContain('2 h');
    });

    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(getByText('2h')).toBeTruthy();
    });
  });

  test('shuttle weekday debug shifts Sunday planning to Monday', async () => {
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY = 'true';
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 22, 10, 20, 0, 0)); // Sunday

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    const shuttlePlanArgs = shuttlePlannerMock.buildShuttlePlan.mock.calls.at(-1)?.[0];
    expect(shuttlePlanArgs).toBeTruthy();
    if (!shuttlePlanArgs) {
      throw new Error('Expected shuttle plan args to be defined');
    }
    expect(shuttlePlanArgs.now).toEqual(new Date(2026, 1, 23, 10, 20, 0, 0));
  });

  test('shuttle weekday debug shifts Saturday planning to Monday', async () => {
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY = 'true';
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 21, 9, 45, 0, 0)); // Saturday

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    const shuttlePlanArgs = shuttlePlannerMock.buildShuttlePlan.mock.calls.at(-1)?.[0];
    expect(shuttlePlanArgs).toBeTruthy();
    if (!shuttlePlanArgs) {
      throw new Error('Expected shuttle plan args to be defined');
    }
    expect(shuttlePlanArgs.now).toEqual(new Date(2026, 1, 23, 9, 45, 0, 0));
  });

  test('shuttle weekday debug keeps weekday planning date unchanged', async () => {
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_WEEKDAY = 'true';
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 24, 8, 5, 0, 0)); // Tuesday

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    const shuttlePlanArgs = shuttlePlannerMock.buildShuttlePlan.mock.calls.at(-1)?.[0];
    expect(shuttlePlanArgs).toBeTruthy();
    if (!shuttlePlanArgs) {
      throw new Error('Expected shuttle plan args to be defined');
    }
    expect(shuttlePlanArgs.now).toEqual(new Date(2026, 1, 24, 8, 5, 0, 0));
  });

  test('shuttle planning honors forced planning datetime when debug env is set', async () => {
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_PLANNING_TIME = '2026-02-25T12:30:00.000Z';

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await pressAndFlush(getByTestId('transport-shuttle'));

    const shuttlePlanArgs = shuttlePlannerMock.buildShuttlePlan.mock.calls.at(-1)?.[0];
    expect(shuttlePlanArgs).toBeTruthy();
    if (!shuttlePlanArgs?.now) {
      throw new Error('Expected shuttle plan args and now to be defined');
    }
    expect(shuttlePlanArgs.now.toISOString()).toBe('2026-02-25T12:30:00.000Z');
  });

  test('openIndoorDirections imperative handle sets indoor-directions view', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { queryByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });

    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_EXPANDED);
    expect(queryByTestId('building-details')).toBeNull();
  });

  test('openIndoorNavigation imperative handle sets indoor-navigation view', async () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);

    await act(async () => {
      ref.current?.openIndoorNavigation();
      await Promise.resolve();
    });

    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_EXPANDED);
  });

  test('imperative openCalendarEventsSlider with no ids and no prior selection opens calendar selection', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} mode="search" />,
    );

    await act(async () => {
      ref.current?.openCalendarEventsSlider([]);
      await Promise.resolve();
    });

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
  });

  test('switching from search to detail mode hides calendar slider', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));
    expect(getByTestId('calendar-selection-slider')).toBeTruthy();

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="detail" />,
    );

    expect(queryByTestId('calendar-selection-slider')).toBeNull();
  });

  test('calendar GO with a resolved room inside a building prompts for exact start room first', async () => {
    crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow.mockReturnValueOnce({
      ok: true,
      flow: {
        startRoomEndpoint: mockSameBuildingRoom,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        originBuilding: mockSameBuildingSearchResult,
        destinationBuilding: mockOtherBuildingSearchResult,
        originTransferPoint: {
          buildingKey: 'H',
          campus: 'SGW',
          accessNodeId: 'H1_F1_building_entry_exit_7',
          outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
          accessible: true,
        },
        destinationTransferPoint: {
          buildingKey: 'VE',
          campus: 'LOYOLA',
          accessNodeId: 'VE_F1_building_entry_exit_6',
          outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
          accessible: true,
        },
        outdoorMode: 'walking',
        currentStage: 'origin_indoor',
      },
    });

    mockResolveCalendarRouteLocation.mockResolvedValueOnce({
      type: 'success',
      value: {
        destinationBuilding: mockOtherBuildingSearchResult,
        destinationRoomEndpoint: mockOtherBuildingRoom,
        startPoint: {
          type: 'automatic',
          coordinates: { latitude: 45.4971, longitude: -73.5791 },
          building: mockSameBuildingSearchResult,
        },
        normalizedEventLocation: 'VE 1 615',
        rawEventLocation: 'VE-1.615',
      },
    });

    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingShape | null>(
        mockSameBuildingSearchResult,
      );
      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          mode={mode}
          selectedBuilding={selectedBuilding}
          passSelectedBuilding={setSelectedBuilding}
          onExitSearch={() => setMode('detail')}
        />
      );
    };

    const { getByTestId } = render(<SearchModeHarness />);
    fireEvent.press(getByTestId('trigger-calendar-go-with-event'));

    await waitFor(() => {
      expect(getByTestId('hybrid-directions-details')).toBeTruthy();
      expect(getByTestId('hybrid-start-label').props.children).toBe('Hall Building');
      expect(getByTestId('hybrid-destination-label').props.children).toBe('VE-1.615');
      expect(getByTestId('hybrid-summary-message').props.children).toBe(
        'Choose your current room as the start point to continue.',
      );
    });

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).not.toHaveBeenCalled();

    await pressAndFlush(getByTestId('hybrid-press-start'));
    await pressAndFlush(getByTestId('select-room-in-search'));
    await pressAndFlush(getByTestId('hybrid-go-button'));

    expect(crossBuildingRouteFlowMock.buildCrossBuildingRouteFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationRoom: mockOtherBuildingRoom,
        outdoorMode: 'walking',
        startRoom: expect.objectContaining({
          id: mockSameBuildingRoom.id,
          label: mockSameBuildingRoom.label,
          buildingKey: 'H',
        }),
      }),
    );

    await waitFor(() => {
      expect(getByTestId('indoor-navigation-details')).toBeTruthy();
      expect(getByTestId('indoor-navigation-start-room').props.children).toBe('H-811');
      expect(getByTestId('indoor-navigation-destination-room').props.children).toBe('H Exit');
      expect(defaultProps.enterIndoorView).toHaveBeenCalled();
      expect(defaultProps.onEnterBuilding).toHaveBeenCalledWith(mockSameBuildingSearchResult);
    });
  });

  // here
  test('handleUpcomingClassPress sets manual start when startPoint type is manual', async () => {
    mockResolveCalendarRouteLocation.mockResolvedValueOnce({
      type: 'success',
      value: {
        destinationBuilding: mockBuildings[1],
        destinationRoomEndpoint: null,
        startPoint: { type: 'manual', reason: 'location_permission_denied' },
        normalizedEventLocation: 'HALL BUILDING 435',
        rawEventLocation: 'Hall Building 435',
      },
    });

    const SearchModeHarness = () => {
      const [mode, setMode] = React.useState<'search' | 'detail'>('search');
      const [selectedBuilding, setSelectedBuilding] = React.useState<BuildingShape | null>(
        mockBuildings[0],
      );
      return (
        <BottomSlider
          {...defaultProps}
          ref={createRef()}
          mode={mode}
          selectedBuilding={selectedBuilding}
          passSelectedBuilding={setSelectedBuilding}
          onExitSearch={() => setMode('detail')}
        />
      );
    };

    const { getByTestId } = render(<SearchModeHarness />);

    fireEvent.press(getByTestId('trigger-calendar-go-with-event'));

    await waitFor(() => {
      expect(getByTestId('direction-details')).toBeTruthy();
      expect(getByTestId('can-start-navigation-state').props.children).toBe('false');
      expect(getByTestId('destination-id').props.children).toBe('loy-1');
    });
  });

  test('openIndoorDirections and openIndoorNavigation both snap to expanded', async () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });
    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_EXPANDED);

    mockSnapToIndex.mockClear();

    await act(async () => {
      ref.current?.openIndoorNavigation();
      await Promise.resolve();
    });
    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_EXPANDED);
  });

  test('handleSelectRoom sets destination room when searchFor is destination', async () => {
    const onIndoorRouteChange = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={mockBuildings[0]}
        onIndoorRouteChange={onIndoorRouteChange}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });

    fireEvent.press(getByTestId('indoor-press-destination'));
    fireEvent.press(getByTestId('select-room-in-search'));

    await waitFor(() => {
      expect(getByTestId('indoor-direction-details')).toBeTruthy();
      expect(onIndoorRouteChange).toHaveBeenCalled();
    });
  });

  test('handleSelectRoom sets start room when searchFor is start', async () => {
    const onIndoorRouteChange = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={mockBuildings[0]}
        onIndoorRouteChange={onIndoorRouteChange}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });

    fireEvent.press(getByTestId('indoor-press-start'));
    fireEvent.press(getByTestId('select-room-in-search'));

    await waitFor(() => {
      expect(getByTestId('indoor-direction-details')).toBeTruthy();
      expect(onIndoorRouteChange).toHaveBeenCalled();
    });
  });

  test('snapPoints uses navigation snap points when activeView is navigation', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: 'mock-polyline',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        userLocation={{ latitude: 45.4585, longitude: -73.6412 }}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await waitFor(() => expect(getByTestId('route-go-button')).toBeTruthy());
    fireEvent.press(getByTestId('route-go-button'));

    await waitFor(() => {
      expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_NAVIGATION_MAX);
    });
  });

  test('open() clamps snap index safely when navigation snap points are active', async () => {
    directionsServiceMock.fetchOutdoorDirections.mockResolvedValue({
      polyline: 'mock-polyline',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: null,
    });

    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={mockBuildings[1]}
        currentBuilding={mockBuildings[0]}
        userLocation={{ latitude: 45.4585, longitude: -73.6412 }}
      />,
    );

    await pressAndFlush(getByTestId('on-show-directions-as-destination'));
    await waitFor(() => expect(getByTestId('route-go-button')).toBeTruthy());
    fireEvent.press(getByTestId('route-go-button'));

    mockSnapToIndex.mockClear();
    expect(() => ref.current?.open(0)).not.toThrow();
    expect(mockSnapToIndex).toHaveBeenCalledWith(SNAP_INDEX_NAVIGATION_MAX);
  });

  test('clearIndoorSearch resets indoor route state', async () => {
    const onIndoorRouteChange = jest.fn();
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={ref}
        selectedBuilding={mockBuildings[0]}
        onIndoorRouteChange={onIndoorRouteChange}
      />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('indoor-press-clear'));

    await waitFor(() => expect(onIndoorRouteChange).toHaveBeenCalledWith(null, null));
  });

  test('handleSelectRoom stays on indoor-directions when already on that view', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );

    await act(async () => {
      ref.current?.openIndoorDirections();
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('indoor-press-destination'));
    fireEvent.press(getByTestId('select-room-in-search'));
    fireEvent.press(getByTestId('indoor-press-start'));
    fireEvent.press(getByTestId('select-room-in-search'));

    expect(getByTestId('indoor-direction-details')).toBeTruthy();
  });

  test('openCalendarSelectionSlider with reset clears prior calendar selection', async () => {
    const ref = createRef<BottomSliderHandle>();
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} mode="search" />,
    );

    fireEvent.press(getByTestId('trigger-calendar-connected'));
    fireEvent.press(getByTestId('calendar-selection-done-button'));
    await act(async () => {
      ref.current?.closeCalendarSlider();
      await Promise.resolve();
    });
    fireEvent.press(getByTestId('trigger-calendar-connected'));

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
  });

  test('showDirections with asDestination false sets building as manual start', async () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));

    expect(getByTestId('direction-details')).toBeTruthy();
    expect(getByTestId('can-start-navigation-state').props.children).toBe('false');
  });

  test('handleSheetClose resets to building view and calls passSelectedBuilding with null', async () => {
    const passSelectedBuilding = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passSelectedBuilding={passSelectedBuilding}
      />,
    );

    fireEvent.press(getByTestId('trigger-on-close'));

    await waitFor(() => {
      expect(getByTestId('building-details')).toBeTruthy();
      expect(passSelectedBuilding).toHaveBeenCalledWith(null);
    });
  });
});
