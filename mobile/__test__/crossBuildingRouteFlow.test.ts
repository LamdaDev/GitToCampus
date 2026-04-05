import { buildCrossBuildingRouteFlow } from '../src/utils/indoor/crossBuildingRouteFlow';
import type { BuildingShape } from '../src/types/BuildingShape';
import type {
  CrossBuildingRoomEndpoint,
  IndoorTransferPoint,
} from '../src/types/CrossBuildingRoute';

jest.mock('../src/utils/indoor/indoorPathFinding', () => ({
  findIndoorPath: jest.fn(),
}));

jest.mock('../src/utils/indoor/indoorGraphs', () => ({
  getIndoorGraph: jest.fn(),
}));

jest.mock('../src/utils/indoor/indoorTransferPoints', () => ({
  getIndoorTransferPoint: jest.fn(),
}));

const { findIndoorPath } = jest.requireMock('../src/utils/indoor/indoorPathFinding') as {
  findIndoorPath: jest.Mock;
};

const { getIndoorGraph } = jest.requireMock('../src/utils/indoor/indoorGraphs') as {
  getIndoorGraph: jest.Mock;
};

const { getIndoorTransferPoint } = jest.requireMock('../src/utils/indoor/indoorTransferPoints') as {
  getIndoorTransferPoint: jest.Mock;
};

const buildingH: BuildingShape = {
  id: 'sgw-h',
  campus: 'SGW',
  name: 'Hall Building',
  shortCode: 'H',
  polygons: [],
};

const buildingMB: BuildingShape = {
  id: 'sgw-mb',
  campus: 'SGW',
  name: 'John Molson School of Business',
  shortCode: 'MB',
  polygons: [],
};

const startRoom: CrossBuildingRoomEndpoint = {
  id: 'room-h-811',
  label: 'H-811',
  buildingId: 'Hall',
  buildingKey: 'H',
  campus: 'SGW',
  floor: 8,
};

const destinationRoom: CrossBuildingRoomEndpoint = {
  id: 'room-mb-130',
  label: 'MB-1.130',
  buildingId: 'MB',
  buildingKey: 'MB',
  campus: 'SGW',
  floor: 1,
};

const originTransferPoint: IndoorTransferPoint = {
  buildingKey: 'H',
  campus: 'SGW',
  accessNodeId: 'hall-exit',
  outdoorCoords: { latitude: 45.497, longitude: -73.579 },
  accessible: true,
};

const destinationTransferPoint: IndoorTransferPoint = {
  buildingKey: 'MB',
  campus: 'SGW',
  accessNodeId: 'mb-exit',
  outdoorCoords: { latitude: 45.495, longitude: -73.5791 },
  accessible: true,
};

describe('buildCrossBuildingRouteFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getIndoorGraph.mockReturnValue({ nodes: [], edges: [] });
    getIndoorTransferPoint.mockImplementation((buildingKey: string) => {
      if (buildingKey === 'H') return originTransferPoint;
      if (buildingKey === 'MB') return destinationTransferPoint;
      return null;
    });
    findIndoorPath.mockReturnValue([{ id: 'path-node' }]);
  });

  test('returns a staged flow for valid cross-building rooms', () => {
    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'transit',
    });

    expect(result).toEqual({
      ok: true,
      flow: {
        startRoomEndpoint: startRoom,
        destinationRoomEndpoint: destinationRoom,
        originBuilding: buildingH,
        destinationBuilding: buildingMB,
        originTransferPoint,
        destinationTransferPoint,
        outdoorMode: 'transit',
        currentStage: 'origin_indoor',
      },
    });
    expect(findIndoorPath).toHaveBeenNthCalledWith(
      1,
      [],
      [],
      startRoom.id,
      originTransferPoint.accessNodeId,
      {
        accessibleOnly: false,
        preferElevators: false,
      },
    );
    expect(findIndoorPath).toHaveBeenNthCalledWith(
      2,
      [],
      [],
      destinationTransferPoint.accessNodeId,
      destinationRoom.id,
      {
        accessibleOnly: false,
        preferElevators: false,
      },
    );
  });

  test('returns a staged flow for a room to building route', () => {
    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationBuilding: buildingMB,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: true,
      flow: {
        startRoomEndpoint: startRoom,
        destinationRoomEndpoint: null,
        originBuilding: buildingH,
        destinationBuilding: buildingMB,
        originTransferPoint,
        destinationTransferPoint: null,
        outdoorMode: 'walking',
        currentStage: 'origin_indoor',
      },
    });
    expect(findIndoorPath).toHaveBeenCalledTimes(1);
    expect(findIndoorPath).toHaveBeenCalledWith(
      [],
      [],
      startRoom.id,
      originTransferPoint.accessNodeId,
      {
        accessibleOnly: false,
        preferElevators: false,
      },
    );
  });

  test('returns a staged flow for a building to room route', () => {
    const result = buildCrossBuildingRouteFlow({
      startBuilding: buildingH,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: true,
      flow: {
        startRoomEndpoint: null,
        destinationRoomEndpoint: destinationRoom,
        originBuilding: buildingH,
        destinationBuilding: buildingMB,
        originTransferPoint: null,
        destinationTransferPoint,
        outdoorMode: 'walking',
        currentStage: 'outdoor',
      },
    });
    expect(findIndoorPath).toHaveBeenCalledTimes(1);
    expect(findIndoorPath).toHaveBeenCalledWith(
      [],
      [],
      destinationTransferPoint.accessNodeId,
      destinationRoom.id,
      {
        accessibleOnly: false,
        preferElevators: false,
      },
    );
  });

  test('returns a staged flow for a current-location to room route', () => {
    const result = buildCrossBuildingRouteFlow({
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'transit',
    });

    expect(result).toEqual({
      ok: true,
      flow: {
        startRoomEndpoint: null,
        destinationRoomEndpoint: destinationRoom,
        originBuilding: null,
        destinationBuilding: buildingMB,
        originTransferPoint: null,
        destinationTransferPoint,
        outdoorMode: 'transit',
        currentStage: 'outdoor',
      },
    });
    expect(findIndoorPath).toHaveBeenCalledTimes(1);
  });

  test('rejects same-building room pairs', () => {
    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom: { ...destinationRoom, buildingKey: 'H' },
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'Choose two rooms in different buildings to start a staged cross-building route.',
    });
    expect(findIndoorPath).not.toHaveBeenCalled();
  });

  test('fails when the origin building shape cannot be resolved', () => {
    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'Building details are unavailable for H.',
    });
  });

  test('fails when the destination building shape cannot be resolved', () => {
    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'Building details are unavailable for MB.',
    });
  });

  test('uses the building key fallback when an origin transfer point is missing and the building name is blank', () => {
    getIndoorTransferPoint.mockImplementation((buildingKey: string) => {
      if (buildingKey === 'MB') return destinationTransferPoint;
      return null;
    });

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [{ ...buildingH, name: '   ' }, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'No building exit is configured yet for H.',
    });
  });

  test('fails when the destination transfer point is missing', () => {
    getIndoorTransferPoint.mockImplementation((buildingKey: string) => {
      if (buildingKey === 'H') return originTransferPoint;
      return null;
    });

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'No building exit is configured yet for John Molson School of Business.',
    });
  });

  test('fails when disability mode has no accessible origin transfer point', () => {
    getIndoorTransferPoint.mockImplementation((buildingKey: string) => {
      if (buildingKey === 'H') return { ...originTransferPoint, accessible: false };
      if (buildingKey === 'MB') return destinationTransferPoint;
      return null;
    });

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'disability',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'Hall Building does not have an accessible transfer point configured yet.',
    });
  });

  test('fails when disability mode has no accessible destination transfer point', () => {
    getIndoorTransferPoint.mockImplementation((buildingKey: string) => {
      if (buildingKey === 'H') return originTransferPoint;
      if (buildingKey === 'MB') return { ...destinationTransferPoint, accessible: false };
      return null;
    });

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'disability',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message:
        'John Molson School of Business does not have an accessible transfer point configured yet.',
    });
  });

  test('fails when no path exists from the origin room to the transfer point', () => {
    findIndoorPath.mockReturnValueOnce(null);

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'No indoor route could be found from H-811 to the exit for Hall Building.',
    });
  });

  test('fails when no path exists from the destination transfer point to the room', () => {
    findIndoorPath.mockReturnValueOnce([{ id: 'origin-ok' }]).mockReturnValueOnce([]);

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message:
        'No indoor route could be found from the entrance of John Molson School of Business to MB-1.130.',
    });
  });

  test('passes accessible path options through both indoor leg checks in disability mode', () => {
    buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'disability',
      outdoorMode: 'shuttle',
    });

    expect(findIndoorPath).toHaveBeenNthCalledWith(
      1,
      [],
      [],
      startRoom.id,
      originTransferPoint.accessNodeId,
      {
        accessibleOnly: true,
        preferElevators: true,
      },
    );
    expect(findIndoorPath).toHaveBeenNthCalledWith(
      2,
      [],
      [],
      destinationTransferPoint.accessNodeId,
      destinationRoom.id,
      {
        accessibleOnly: true,
        preferElevators: true,
      },
    );
  });

  test('fails when no graph is available for the origin building', () => {
    getIndoorGraph.mockImplementation((buildingKey: string) =>
      buildingKey === 'H' ? null : { nodes: [], edges: [] },
    );

    const result = buildCrossBuildingRouteFlow({
      startRoom,
      destinationRoom,
      buildings: [buildingH, buildingMB],
      indoorTravelMode: 'walking',
      outdoorMode: 'walking',
    });

    expect(result).toEqual({
      ok: false,
      message: 'No indoor route could be found from H-811 to the exit for Hall Building.',
    });
  });
});
