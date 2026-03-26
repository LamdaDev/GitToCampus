import type { LatLng } from 'react-native-maps';

import type { BuildingShape } from './BuildingShape';
import type { Campus } from './Campus';
import type { IndoorRoutePlannerMode, RoutePlannerMode } from './SheetMode';
import type { IndoorBuildingKey } from '../utils/indoor/buildingKeys';

export type IndoorTransferPoint = {
  buildingKey: IndoorBuildingKey;
  campus: Campus;
  accessNodeId: string;
  outdoorCoords: LatLng;
  accessible: boolean;
};

export type CrossBuildingRouteStage =
  | 'origin_indoor'
  | 'outdoor'
  | 'destination_indoor'
  | 'completed';

export type CrossBuildingRoomEndpoint = {
  id: string;
  label: string;
  buildingId: string;
  buildingKey: IndoorBuildingKey;
  campus: Campus | null;
  floor: number;
};

export type CrossBuildingRouteFlow = {
  startRoomEndpoint: CrossBuildingRoomEndpoint;
  destinationRoomEndpoint: CrossBuildingRoomEndpoint;
  originBuilding: BuildingShape;
  destinationBuilding: BuildingShape;
  originTransferPoint: IndoorTransferPoint;
  destinationTransferPoint: IndoorTransferPoint;
  outdoorMode: RoutePlannerMode;
  currentStage: CrossBuildingRouteStage;
};

export type BuildCrossBuildingRouteFlowInput = {
  startRoom: CrossBuildingRoomEndpoint;
  destinationRoom: CrossBuildingRoomEndpoint;
  buildings: BuildingShape[];
  indoorTravelMode: IndoorRoutePlannerMode;
  outdoorMode: RoutePlannerMode;
};

export type BuildCrossBuildingRouteFlowResult =
  | { ok: true; flow: CrossBuildingRouteFlow }
  | { ok: false; message: string };
