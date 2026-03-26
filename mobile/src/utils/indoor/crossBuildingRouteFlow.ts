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

const resolveBuildingShape = (
  buildings: BuildCrossBuildingRouteFlowInput['buildings'],
  buildingKey: IndoorBuildingKey,
) => {
  return buildings.find((building) => getIndoorBuildingKeyFromShape(building) === buildingKey) ?? null;
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

export const buildCrossBuildingRouteFlow = ({
  startRoom,
  destinationRoom,
  buildings,
  indoorTravelMode,
  outdoorMode,
}: BuildCrossBuildingRouteFlowInput): BuildCrossBuildingRouteFlowResult => {
  if (startRoom.buildingKey === destinationRoom.buildingKey) {
    return {
      ok: false,
      message: 'Choose two rooms in different buildings to start a staged cross-building route.',
    };
  }

  const originBuilding = resolveBuildingShape(buildings, startRoom.buildingKey);
  if (!originBuilding) {
    return {
      ok: false,
      message: `Building details are unavailable for ${startRoom.buildingKey}.`,
    };
  }

  const destinationBuilding = resolveBuildingShape(buildings, destinationRoom.buildingKey);
  if (!destinationBuilding) {
    return {
      ok: false,
      message: `Building details are unavailable for ${destinationRoom.buildingKey}.`,
    };
  }

  const originTransferPoint = getIndoorTransferPoint(startRoom.buildingKey);
  if (!originTransferPoint) {
    return {
      ok: false,
      message: `No building exit is configured yet for ${getBuildingLabel(originBuilding.name, startRoom.buildingKey)}.`,
    };
  }

  const destinationTransferPoint = getIndoorTransferPoint(destinationRoom.buildingKey);
  if (!destinationTransferPoint) {
    return {
      ok: false,
      message: `No building exit is configured yet for ${getBuildingLabel(destinationBuilding.name, destinationRoom.buildingKey)}.`,
    };
  }

  if (indoorTravelMode === 'disability') {
    if (!originTransferPoint.accessible) {
      return {
        ok: false,
        message: `${getBuildingLabel(originBuilding.name, startRoom.buildingKey)} does not have an accessible transfer point configured yet.`,
      };
    }

    if (!destinationTransferPoint.accessible) {
      return {
        ok: false,
        message: `${getBuildingLabel(destinationBuilding.name, destinationRoom.buildingKey)} does not have an accessible transfer point configured yet.`,
      };
    }
  }

  if (
    !canReachTransferPoint({
      buildingKey: startRoom.buildingKey,
      startId: startRoom.id,
      endId: originTransferPoint.accessNodeId,
      indoorTravelMode,
    })
  ) {
    return {
      ok: false,
      message: `No indoor route could be found from ${startRoom.label} to the exit for ${getBuildingLabel(originBuilding.name, startRoom.buildingKey)}.`,
    };
  }

  if (
    !canReachTransferPoint({
      buildingKey: destinationRoom.buildingKey,
      startId: destinationTransferPoint.accessNodeId,
      endId: destinationRoom.id,
      indoorTravelMode,
    })
  ) {
    return {
      ok: false,
      message: `No indoor route could be found from the entrance of ${getBuildingLabel(destinationBuilding.name, destinationRoom.buildingKey)} to ${destinationRoom.label}.`,
    };
  }

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
