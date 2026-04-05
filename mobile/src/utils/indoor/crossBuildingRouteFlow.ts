import type {
  BuildCrossBuildingRouteFlowInput,
  BuildCrossBuildingRouteFlowResult,
} from '../../types/CrossBuildingRoute';
import { findIndoorPath } from './indoorPathFinding';
import { getIndoorGraph } from './indoorGraphs';
import { getIndoorTransferPoint } from './indoorTransferPoints';
import { getIndoorBuildingKeyFromShape, type IndoorBuildingKey } from './buildingKeys';

const getBuildingLabel = (buildingName: string, buildingKey: IndoorBuildingKey) =>
  buildingName.trim() || buildingKey;

const toFailureResult = (message: string): BuildCrossBuildingRouteFlowResult => ({
  ok: false,
  message,
});

const resolveBuildingShape = (
  buildings: BuildCrossBuildingRouteFlowInput['buildings'],
  buildingKey: IndoorBuildingKey,
) => {
  return (
    buildings.find((building) => getIndoorBuildingKeyFromShape(building) === buildingKey) ?? null
  );
};

type ResolvedRouteBuildings = {
  originBuilding: NonNullable<ReturnType<typeof resolveBuildingShape>>;
  destinationBuilding: NonNullable<ReturnType<typeof resolveBuildingShape>>;
};

const resolveRouteBuildings = ({
  buildings,
  startBuildingKey,
  destinationBuildingKey,
}: {
  buildings: BuildCrossBuildingRouteFlowInput['buildings'];
  startBuildingKey: IndoorBuildingKey;
  destinationBuildingKey: IndoorBuildingKey;
}): ResolvedRouteBuildings | BuildCrossBuildingRouteFlowResult => {
  const originBuilding = resolveBuildingShape(buildings, startBuildingKey);
  if (!originBuilding) {
    return toFailureResult(`Building details are unavailable for ${startBuildingKey}.`);
  }

  const destinationBuilding = resolveBuildingShape(buildings, destinationBuildingKey);
  if (!destinationBuilding) {
    return toFailureResult(`Building details are unavailable for ${destinationBuildingKey}.`);
  }

  return { originBuilding, destinationBuilding };
};

type IndoorTransferPoint = NonNullable<ReturnType<typeof getIndoorTransferPoint>>;

type ResolvedTransferPoints = {
  originTransferPoint: IndoorTransferPoint;
  destinationTransferPoint: IndoorTransferPoint;
};

const resolveTransferPoints = ({
  startBuildingKey,
  destinationBuildingKey,
  originBuildingName,
  destinationBuildingName,
}: {
  startBuildingKey: IndoorBuildingKey;
  destinationBuildingKey: IndoorBuildingKey;
  originBuildingName: string;
  destinationBuildingName: string;
}): ResolvedTransferPoints | BuildCrossBuildingRouteFlowResult => {
  const originTransferPoint = getIndoorTransferPoint(startBuildingKey);
  if (!originTransferPoint) {
    return toFailureResult(
      `No building exit is configured yet for ${getBuildingLabel(originBuildingName, startBuildingKey)}.`,
    );
  }

  const destinationTransferPoint = getIndoorTransferPoint(destinationBuildingKey);
  if (!destinationTransferPoint) {
    return toFailureResult(
      `No building exit is configured yet for ${getBuildingLabel(destinationBuildingName, destinationBuildingKey)}.`,
    );
  }

  return { originTransferPoint, destinationTransferPoint };
};

const getAccessibilityValidationError = ({
  indoorTravelMode,
  originTransferPoint,
  destinationTransferPoint,
  originBuildingName,
  destinationBuildingName,
  startBuildingKey,
  destinationBuildingKey,
}: {
  indoorTravelMode: BuildCrossBuildingRouteFlowInput['indoorTravelMode'];
  originTransferPoint: IndoorTransferPoint;
  destinationTransferPoint: IndoorTransferPoint;
  originBuildingName: string;
  destinationBuildingName: string;
  startBuildingKey: IndoorBuildingKey;
  destinationBuildingKey: IndoorBuildingKey;
}): BuildCrossBuildingRouteFlowResult | null => {
  if (indoorTravelMode !== 'disability') return null;

  if (!originTransferPoint.accessible) {
    return toFailureResult(
      `${getBuildingLabel(originBuildingName, startBuildingKey)} does not have an accessible transfer point configured yet.`,
    );
  }

  if (!destinationTransferPoint.accessible) {
    return toFailureResult(
      `${getBuildingLabel(destinationBuildingName, destinationBuildingKey)} does not have an accessible transfer point configured yet.`,
    );
  }

  return null;
};

const canReachTransferPoint = ({
  buildingKey,
  startId,
  endId,
  indoorTravelMode,
}: {
  buildingKey: IndoorBuildingKey;
  startId: string;
  endId: string;
  indoorTravelMode: BuildCrossBuildingRouteFlowInput['indoorTravelMode'];
}) => {
  const graph = getIndoorGraph(buildingKey);
  if (!graph) return false;

  const path = findIndoorPath(graph.nodes, graph.edges, startId, endId, {
    accessibleOnly: indoorTravelMode === 'disability',
    preferElevators: indoorTravelMode === 'disability',
  });
  return Boolean(path && path.length > 0);
};

const getTransferReachabilityValidationError = ({
  startRoom,
  destinationRoom,
  indoorTravelMode,
  originTransferPoint,
  destinationTransferPoint,
  originBuildingName,
  destinationBuildingName,
}: {
  startRoom: BuildCrossBuildingRouteFlowInput['startRoom'];
  destinationRoom: BuildCrossBuildingRouteFlowInput['destinationRoom'];
  indoorTravelMode: BuildCrossBuildingRouteFlowInput['indoorTravelMode'];
  originTransferPoint: IndoorTransferPoint;
  destinationTransferPoint: IndoorTransferPoint;
  originBuildingName: string;
  destinationBuildingName: string;
}): BuildCrossBuildingRouteFlowResult | null => {
  const canReachOriginTransferPoint = canReachTransferPoint({
    buildingKey: startRoom.buildingKey,
    startId: startRoom.id,
    endId: originTransferPoint.accessNodeId,
    indoorTravelMode,
  });
  if (!canReachOriginTransferPoint) {
    return toFailureResult(
      `No indoor route could be found from ${startRoom.label} to the exit for ${getBuildingLabel(originBuildingName, startRoom.buildingKey)}.`,
    );
  }

  const canReachDestinationRoom = canReachTransferPoint({
    buildingKey: destinationRoom.buildingKey,
    startId: destinationTransferPoint.accessNodeId,
    endId: destinationRoom.id,
    indoorTravelMode,
  });
  if (!canReachDestinationRoom) {
    return toFailureResult(
      `No indoor route could be found from the entrance of ${getBuildingLabel(destinationBuildingName, destinationRoom.buildingKey)} to ${destinationRoom.label}.`,
    );
  }

  return null;
};

export const buildCrossBuildingRouteFlow = ({
  startRoom,
  destinationRoom,
  buildings,
  indoorTravelMode,
  outdoorMode,
}: BuildCrossBuildingRouteFlowInput): BuildCrossBuildingRouteFlowResult => {
  if (startRoom.buildingKey === destinationRoom.buildingKey) {
    return toFailureResult(
      'Choose two rooms in different buildings to start a staged cross-building route.',
    );
  }

  const resolvedRouteBuildings = resolveRouteBuildings({
    buildings,
    startBuildingKey: startRoom.buildingKey,
    destinationBuildingKey: destinationRoom.buildingKey,
  });
  if ('ok' in resolvedRouteBuildings) {
    return resolvedRouteBuildings;
  }
  const { originBuilding, destinationBuilding } = resolvedRouteBuildings;

  const resolvedTransferPoints = resolveTransferPoints({
    startBuildingKey: startRoom.buildingKey,
    destinationBuildingKey: destinationRoom.buildingKey,
    originBuildingName: originBuilding.name,
    destinationBuildingName: destinationBuilding.name,
  });
  if ('ok' in resolvedTransferPoints) {
    return resolvedTransferPoints;
  }
  const { originTransferPoint, destinationTransferPoint } = resolvedTransferPoints;

  const accessibilityValidationError = getAccessibilityValidationError({
    indoorTravelMode,
    originTransferPoint,
    destinationTransferPoint,
    originBuildingName: originBuilding.name,
    destinationBuildingName: destinationBuilding.name,
    startBuildingKey: startRoom.buildingKey,
    destinationBuildingKey: destinationRoom.buildingKey,
  });
  if (accessibilityValidationError) return accessibilityValidationError;

  const transferReachabilityValidationError = getTransferReachabilityValidationError({
    startRoom,
    destinationRoom,
    indoorTravelMode,
    originTransferPoint,
    destinationTransferPoint,
    originBuildingName: originBuilding.name,
    destinationBuildingName: destinationBuilding.name,
  });
  if (transferReachabilityValidationError) return transferReachabilityValidationError;

  return {
    ok: true,
    flow: {
      startRoomEndpoint: startRoom,
      destinationRoomEndpoint: destinationRoom,
      originBuilding,
      destinationBuilding,
      originTransferPoint,
      destinationTransferPoint,
      outdoorMode,
      currentStage: 'origin_indoor',
    },
  };
};
