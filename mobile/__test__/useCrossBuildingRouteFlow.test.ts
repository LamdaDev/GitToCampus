import type { BuildingShape } from '../src/types/BuildingShape';
import type { CrossBuildingRouteFlow } from '../src/types/CrossBuildingRoute';
import {
  crossBuildingRouteFlowReducer,
  getCrossBuildingRouteFlowPresentation,
  initialCrossBuildingRouteFlowState,
} from '../src/hooks/useCrossBuildingRouteFlow';

const originBuilding: BuildingShape = {
  id: 'building-h',
  name: 'Hall Building',
  shortCode: 'H',
  campus: 'SGW',
  polygons: [],
};

const destinationBuilding: BuildingShape = {
  id: 'building-ve',
  name: 'VE Building',
  shortCode: 'VE',
  campus: 'LOYOLA',
  polygons: [],
};

const baseFlow: CrossBuildingRouteFlow = {
  startRoomEndpoint: {
    id: 'room-h-811',
    label: 'H-811',
    buildingId: 'Hall',
    buildingKey: 'H',
    campus: 'SGW',
    floor: 8,
  },
  destinationRoomEndpoint: {
    id: 'room-ve-101',
    label: 'VE-101',
    buildingId: 'VE',
    buildingKey: 'VE',
    campus: 'LOYOLA',
    floor: 1,
  },
  originBuilding,
  destinationBuilding,
  originTransferPoint: {
    buildingKey: 'H',
    campus: 'SGW',
    accessNodeId: 'hall-exit',
    outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
    accessible: true,
  },
  destinationTransferPoint: {
    buildingKey: 'VE',
    campus: 'LOYOLA',
    accessNodeId: 've-entrance',
    outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
    accessible: true,
  },
  outdoorMode: 'walking',
  currentStage: 'origin_indoor',
};

describe('useCrossBuildingRouteFlow reducer', () => {
  test('starts a new flow and clears any stale hybrid error or overrides', () => {
    const staleState = {
      flow: null,
      hybridRouteErrorMessage: 'Old error',
      routeOriginOverride: { latitude: 1, longitude: 2 },
      routeDestinationOverride: { latitude: 3, longitude: 4 },
    };

    expect(
      crossBuildingRouteFlowReducer(staleState, {
        type: 'start_flow',
        flow: baseFlow,
      }),
    ).toEqual({
      flow: baseFlow,
      hybridRouteErrorMessage: null,
      routeOriginOverride: null,
      routeDestinationOverride: null,
    });
  });

  test('advances the flow to outdoor and derives outdoor route overrides', () => {
    const state = crossBuildingRouteFlowReducer(initialCrossBuildingRouteFlowState, {
      type: 'start_flow',
      flow: baseFlow,
    });

    expect(
      crossBuildingRouteFlowReducer(state, {
        type: 'advance_to_outdoor',
      }),
    ).toEqual({
      flow: {
        ...baseFlow,
        currentStage: 'outdoor',
      },
      hybridRouteErrorMessage: null,
      routeOriginOverride: baseFlow.originTransferPoint.outdoorCoords,
      routeDestinationOverride: baseFlow.destinationTransferPoint.outdoorCoords,
    });
  });

  test('advances the flow to destination indoor and clears outdoor overrides', () => {
    const outdoorState = crossBuildingRouteFlowReducer(
      {
        flow: {
          ...baseFlow,
          currentStage: 'outdoor',
        },
        hybridRouteErrorMessage: null,
        routeOriginOverride: baseFlow.originTransferPoint.outdoorCoords,
        routeDestinationOverride: baseFlow.destinationTransferPoint.outdoorCoords,
      },
      {
        type: 'advance_to_destination_indoor',
      },
    );

    expect(outdoorState).toEqual({
      flow: {
        ...baseFlow,
        currentStage: 'destination_indoor',
      },
      hybridRouteErrorMessage: null,
      routeOriginOverride: null,
      routeDestinationOverride: null,
    });
  });

  test('ignores invalid stage transitions', () => {
    const startedState = crossBuildingRouteFlowReducer(initialCrossBuildingRouteFlowState, {
      type: 'start_flow',
      flow: {
        ...baseFlow,
        currentStage: 'destination_indoor',
      },
    });

    const nextState = crossBuildingRouteFlowReducer(startedState, {
      type: 'advance_to_outdoor',
    });

    expect(nextState).toBe(startedState);
  });
});

describe('getCrossBuildingRouteFlowPresentation', () => {
  test('returns the origin indoor navigation labels and action', () => {
    expect(
      getCrossBuildingRouteFlowPresentation({
        flow: baseFlow,
        fallbackBuilding: null,
        fallbackStartLabel: null,
        fallbackDestinationLabel: null,
      }),
    ).toEqual({
      hasDirectionsStageAction: false,
      indoorNavigationBuilding: originBuilding,
      indoorNavigationStartLabel: 'H-811',
      indoorNavigationDestinationLabel: 'H Exit',
      indoorStageActionLabel: 'Continue to Outdoor Directions',
      directionStageActionLabel: undefined,
    });
  });

  test('returns the destination indoor labels after the outdoor leg', () => {
    expect(
      getCrossBuildingRouteFlowPresentation({
        flow: {
          ...baseFlow,
          currentStage: 'destination_indoor',
        },
        fallbackBuilding: null,
        fallbackStartLabel: null,
        fallbackDestinationLabel: null,
      }),
    ).toEqual({
      hasDirectionsStageAction: false,
      indoorNavigationBuilding: destinationBuilding,
      indoorNavigationStartLabel: 'VE Entrance',
      indoorNavigationDestinationLabel: 'VE-101',
      indoorStageActionLabel: undefined,
      directionStageActionLabel: undefined,
    });
  });

  test('falls back to the active indoor labels when no staged flow is active', () => {
    expect(
      getCrossBuildingRouteFlowPresentation({
        flow: null,
        fallbackBuilding: originBuilding,
        fallbackStartLabel: 'H-801',
        fallbackDestinationLabel: 'H-805',
      }),
    ).toEqual({
      hasDirectionsStageAction: false,
      indoorNavigationBuilding: originBuilding,
      indoorNavigationStartLabel: 'H-801',
      indoorNavigationDestinationLabel: 'H-805',
      indoorStageActionLabel: undefined,
      directionStageActionLabel: undefined,
    });
  });
});
