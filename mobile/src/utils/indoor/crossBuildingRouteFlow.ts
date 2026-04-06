import type {
  BuildCrossBuildingRouteFlowInput,
  BuildCrossBuildingRouteFlowResult,
  CrossBuildingRoomEndpoint,
  IndoorTransferPoint,
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
  return (
    buildings.find((building) => getIndoorBuildingKeyFromShape(building) === buildingKey) ?? null
  );
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

const validateTransferPoint = ({
  room,
  buildingKey,
  buildingName,
  transferPoint,
  indoorTravelMode,
  direction,
}: {
  room: CrossBuildingRoomEndpoint | null | undefined;
  buildingKey: IndoorBuildingKey;
  buildingName: string;
  transferPoint: IndoorTransferPoint | null;
  indoorTravelMode: BuildCrossBuildingRouteFlowInput['indoorTravelMode'];
  direction: 'origin' | 'destination';
}): { ok: true } | { ok: false; message: string } => {
  if (!room) return { ok: true };

  if (!transferPoint) {
    return {
      ok: false,
      message: `No building exit is configured yet for ${getBuildingLabel(buildingName, buildingKey)}.`,
    };
  }

  if (indoorTravelMode === 'disability' && !transferPoint.accessible) {
    return {
      ok: false,
      message: `${getBuildingLabel(buildingName, buildingKey)} does not have an accessible transfer point configured yet.`,
    };
  }

  const canReach =
    direction === 'origin'
      ? canReachTransferPoint({
          buildingKey,
          startId: room.id,
          endId: transferPoint.accessNodeId,
          indoorTravelMode,
        })
      : canReachTransferPoint({
          buildingKey,
          startId: transferPoint.accessNodeId,
          endId: room.id,
          indoorTravelMode,
        });

  if (canReach) return { ok: true };

  return {
    ok: false,
    message:
      direction === 'origin'
        ? `No indoor route could be found from ${room.label} to the exit for ${getBuildingLabel(buildingName, buildingKey)}.`
        : `No indoor route could be found from the entrance of ${getBuildingLabel(buildingName, buildingKey)} to ${room.label}.`,
  };
};

type ResolvedEndpointBuildings = {
  originBuildingKey: IndoorBuildingKey | null;
  destinationBuildingKey: IndoorBuildingKey | null;
  originBuilding: BuildCrossBuildingRouteFlowInput['startBuilding'];
  destinationBuilding: NonNullable<BuildCrossBuildingRouteFlowInput['destinationBuilding']>;
};

const resolveEndpointBuildings = ({
  startRoom,
  startBuilding,
  destinationRoom,
  destinationBuilding,
  buildings,
}: Pick<
  BuildCrossBuildingRouteFlowInput,
  'startRoom' | 'startBuilding' | 'destinationRoom' | 'destinationBuilding' | 'buildings'
>): { ok: true; value: ResolvedEndpointBuildings } | { ok: false; message: string } => {
  const originBuildingKey =
    startRoom?.buildingKey ?? getIndoorBuildingKeyFromShape(startBuilding ?? null);
  const destinationBuildingKey =
    destinationRoom?.buildingKey ?? getIndoorBuildingKeyFromShape(destinationBuilding ?? null);

  if (originBuildingKey && destinationBuildingKey && originBuildingKey === destinationBuildingKey) {
    return {
      ok: false,
      message:
        startRoom && destinationRoom
          ? 'Choose two rooms in different buildings to start a staged cross-building route.'
          : 'Choose endpoints in different buildings to start a staged hybrid route.',
    };
  }

  const originBuilding =
    startRoom && originBuildingKey
      ? resolveBuildingShape(buildings, originBuildingKey)
      : (startBuilding ?? null);
  if (startRoom && (!originBuilding || !originBuildingKey)) {
    return {
      ok: false,
      message: `Building details are unavailable for ${startRoom.buildingKey}.`,
    };
  }

  const resolvedDestinationBuilding =
    destinationRoom && destinationBuildingKey
      ? resolveBuildingShape(buildings, destinationBuildingKey)
      : (destinationBuilding ?? null);
  if (!resolvedDestinationBuilding) {
    return {
      ok: false,
      message: `Building details are unavailable for ${destinationRoom?.buildingKey ?? 'the selected destination'}.`,
    };
  }

  return {
    ok: true,
    value: {
      originBuildingKey,
      destinationBuildingKey,
      originBuilding,
      destinationBuilding: resolvedDestinationBuilding,
    },
  };
};

const validateIndoorTransferPoints = ({
  startRoom,
  originBuilding,
  originBuildingKey,
  destinationRoom,
  destinationBuilding,
  destinationBuildingKey,
  originTransferPoint,
  destinationTransferPoint,
  indoorTravelMode,
}: {
  startRoom: BuildCrossBuildingRouteFlowInput['startRoom'];
  originBuilding: BuildCrossBuildingRouteFlowInput['startBuilding'];
  originBuildingKey: IndoorBuildingKey | null;
  destinationRoom: BuildCrossBuildingRouteFlowInput['destinationRoom'];
  destinationBuilding: NonNullable<BuildCrossBuildingRouteFlowInput['destinationBuilding']>;
  destinationBuildingKey: IndoorBuildingKey | null;
  originTransferPoint: IndoorTransferPoint | null;
  destinationTransferPoint: IndoorTransferPoint | null;
  indoorTravelMode: BuildCrossBuildingRouteFlowInput['indoorTravelMode'];
}): { ok: true } | { ok: false; message: string } => {
  if (startRoom && originBuilding && originBuildingKey) {
    const originValidation = validateTransferPoint({
      room: startRoom,
      buildingKey: originBuildingKey,
      buildingName: originBuilding.name,
      transferPoint: originTransferPoint,
      indoorTravelMode,
      direction: 'origin',
    });
    if (!originValidation.ok) {
      return originValidation;
    }
  }

  if (destinationRoom && destinationBuildingKey) {
    const destinationValidation = validateTransferPoint({
      room: destinationRoom,
      buildingKey: destinationBuildingKey,
      buildingName: destinationBuilding.name,
      transferPoint: destinationTransferPoint,
      indoorTravelMode,
      direction: 'destination',
    });
    if (!destinationValidation.ok) {
      return destinationValidation;
    }
  }

  return { ok: true };
};

export const buildCrossBuildingRouteFlow = ({
  startRoom,
  startBuilding,
  destinationRoom,
  destinationBuilding,
  buildings,
  indoorTravelMode,
  outdoorMode,
}: BuildCrossBuildingRouteFlowInput): BuildCrossBuildingRouteFlowResult => {
  if (!startRoom && !destinationRoom) {
    return {
      ok: false,
      message: 'Choose at least one room to start a staged hybrid route.',
    };
  }

  const resolvedEndpoints = resolveEndpointBuildings({
    startRoom,
    startBuilding,
    destinationRoom,
    destinationBuilding,
    buildings,
  });
  if (!resolvedEndpoints.ok) {
    return resolvedEndpoints;
  }

  const {
    originBuildingKey,
    destinationBuildingKey,
    originBuilding,
    destinationBuilding: resolvedDestinationBuilding,
  } = resolvedEndpoints.value;

  const originTransferPoint = startRoom ? getIndoorTransferPoint(startRoom.buildingKey) : null;
  const destinationTransferPoint = destinationRoom
    ? getIndoorTransferPoint(destinationRoom.buildingKey)
    : null;

  const transferValidation = validateIndoorTransferPoints({
    startRoom,
    originBuilding,
    originBuildingKey,
    destinationRoom,
    destinationBuilding: resolvedDestinationBuilding,
    destinationBuildingKey,
    originTransferPoint,
    destinationTransferPoint,
    indoorTravelMode,
  });
  if (!transferValidation.ok) {
    return transferValidation;
  }

  const initialStage = startRoom ? 'origin_indoor' : 'outdoor';

  return {
    ok: true,
    flow: {
      startRoomEndpoint: startRoom ?? null,
      destinationRoomEndpoint: destinationRoom ?? null,
      originBuilding,
      destinationBuilding: resolvedDestinationBuilding,
      originTransferPoint,
      destinationTransferPoint,
      outdoorMode,
      currentStage: initialStage,
    },
  };
};
