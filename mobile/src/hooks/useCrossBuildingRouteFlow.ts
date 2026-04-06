import { useCallback, useReducer } from 'react';
import type { LatLng } from 'react-native-maps';

import type { BuildingShape } from '../types/BuildingShape';
import type { CrossBuildingRouteFlow } from '../types/CrossBuildingRoute';

export type CrossBuildingRouteFlowState = {
  flow: CrossBuildingRouteFlow | null;
  hybridRouteErrorMessage: string | null;
  routeOriginOverride: LatLng | null;
  routeDestinationOverride: LatLng | null;
};

type CrossBuildingRouteFlowAction =
  | { type: 'reset' }
  | { type: 'set_hybrid_error'; message: string | null }
  | { type: 'start_flow'; flow: CrossBuildingRouteFlow }
  | { type: 'advance_to_outdoor' }
  | { type: 'advance_to_destination_indoor' };

type CrossBuildingRouteFlowPresentationInput = {
  flow: CrossBuildingRouteFlow | null;
  fallbackBuilding: BuildingShape | null;
  fallbackStartLabel: string | null;
  fallbackDestinationLabel: string | null;
};

export type CrossBuildingRouteFlowPresentation = {
  hasDirectionsStageAction: boolean;
  indoorNavigationBuilding: BuildingShape | null;
  indoorNavigationStartLabel: string | null;
  indoorNavigationDestinationLabel: string | null;
  indoorStageActionLabel?: string;
  directionStageActionLabel?: string;
};

export const initialCrossBuildingRouteFlowState: CrossBuildingRouteFlowState = {
  flow: null,
  hybridRouteErrorMessage: null,
  routeOriginOverride: null,
  routeDestinationOverride: null,
};

const getBuildingWaypointLabel = (building: BuildingShape) => building.shortCode ?? building.name;

export const crossBuildingRouteFlowReducer = (
  state: CrossBuildingRouteFlowState,
  action: CrossBuildingRouteFlowAction,
): CrossBuildingRouteFlowState => {
  switch (action.type) {
    case 'reset':
      return initialCrossBuildingRouteFlowState;
    case 'set_hybrid_error':
      return {
        ...state,
        hybridRouteErrorMessage: action.message,
      };
    case 'start_flow':
      return {
        flow: action.flow,
        hybridRouteErrorMessage: null,
        routeOriginOverride:
          action.flow.currentStage === 'outdoor'
            ? (action.flow.originTransferPoint?.outdoorCoords ?? null)
            : null,
        routeDestinationOverride:
          action.flow.currentStage === 'outdoor'
            ? (action.flow.destinationTransferPoint?.outdoorCoords ?? null)
            : null,
      };
    case 'advance_to_outdoor':
      if (state.flow?.currentStage !== 'origin_indoor') return state;

      return {
        ...state,
        flow: {
          ...state.flow,
          currentStage: 'outdoor',
        },
        routeOriginOverride: state.flow.originTransferPoint?.outdoorCoords ?? null,
        routeDestinationOverride: state.flow.destinationTransferPoint?.outdoorCoords ?? null,
      };
    case 'advance_to_destination_indoor':
      if (state.flow?.currentStage !== 'outdoor') return state;
      if (!state.flow.destinationRoomEndpoint || !state.flow.destinationTransferPoint) return state;

      return {
        ...state,
        flow: {
          ...state.flow,
          currentStage: 'destination_indoor',
        },
        routeOriginOverride: null,
        routeDestinationOverride: null,
      };
    default:
      return state;
  }
};

export const getCrossBuildingRouteFlowPresentation = ({
  flow,
  fallbackBuilding,
  fallbackStartLabel,
  fallbackDestinationLabel,
}: CrossBuildingRouteFlowPresentationInput): CrossBuildingRouteFlowPresentation => {
  if (
    flow?.currentStage === 'destination_indoor' &&
    flow.destinationRoomEndpoint &&
    flow.destinationTransferPoint
  ) {
    return {
      hasDirectionsStageAction: false,
      indoorNavigationBuilding: flow.destinationBuilding,
      indoorNavigationStartLabel: `${getBuildingWaypointLabel(flow.destinationBuilding)} Entrance`,
      indoorNavigationDestinationLabel: flow.destinationRoomEndpoint.label,
      directionStageActionLabel: undefined,
      indoorStageActionLabel: undefined,
    };
  }

  if (flow?.currentStage === 'origin_indoor' && flow.originBuilding && flow.startRoomEndpoint) {
    return {
      hasDirectionsStageAction: false,
      indoorNavigationBuilding: flow.originBuilding,
      indoorNavigationStartLabel: flow.startRoomEndpoint.label,
      indoorNavigationDestinationLabel: `${getBuildingWaypointLabel(flow.originBuilding)} Exit`,
      indoorStageActionLabel: 'Continue to Outdoor Directions',
      directionStageActionLabel: undefined,
    };
  }

  return {
    hasDirectionsStageAction:
      flow?.currentStage === 'outdoor' &&
      Boolean(flow.destinationRoomEndpoint && flow.destinationTransferPoint),
    indoorNavigationBuilding: fallbackBuilding,
    indoorNavigationStartLabel: fallbackStartLabel,
    indoorNavigationDestinationLabel: fallbackDestinationLabel,
    indoorStageActionLabel: undefined,
    directionStageActionLabel:
      flow?.currentStage === 'outdoor' &&
      flow.destinationRoomEndpoint &&
      flow.destinationTransferPoint
        ? 'Enter Building'
        : undefined,
  };
};

export const useCrossBuildingRouteFlow = () => {
  const [state, dispatch] = useReducer(
    crossBuildingRouteFlowReducer,
    initialCrossBuildingRouteFlowState,
  );

  const clearCrossBuildingRouteFlowState = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  const setHybridRouteErrorMessage = useCallback((message: string | null) => {
    dispatch({ type: 'set_hybrid_error', message });
  }, []);

  const startCrossBuildingRouteFlow = useCallback((flow: CrossBuildingRouteFlow) => {
    dispatch({ type: 'start_flow', flow });
  }, []);

  const continueCrossBuildingRouteFlowToOutdoor = useCallback(() => {
    dispatch({ type: 'advance_to_outdoor' });
  }, []);

  const continueCrossBuildingRouteFlowToDestinationIndoor = useCallback(() => {
    dispatch({ type: 'advance_to_destination_indoor' });
  }, []);

  return {
    crossBuildingRouteFlow: state.flow,
    hybridRouteErrorMessage: state.hybridRouteErrorMessage,
    routeOriginOverride: state.routeOriginOverride,
    routeDestinationOverride: state.routeDestinationOverride,
    clearCrossBuildingRouteFlowState,
    setHybridRouteErrorMessage,
    startCrossBuildingRouteFlow,
    continueCrossBuildingRouteFlowToOutdoor,
    continueCrossBuildingRouteFlowToDestinationIndoor,
  };
};
