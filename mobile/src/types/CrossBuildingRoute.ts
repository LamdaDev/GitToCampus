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
  startRoomEndpoint: CrossBuildingRoomEndpoint | null;
  destinationRoomEndpoint: CrossBuildingRoomEndpoint | null;
  originBuilding: BuildingShape | null;
  destinationBuilding: BuildingShape;
  originTransferPoint: IndoorTransferPoint | null;
  destinationTransferPoint: IndoorTransferPoint | null;
  outdoorMode: RoutePlannerMode;
  currentStage: CrossBuildingRouteStage;
};

export type BuildCrossBuildingRouteFlowInput = {
  startRoom?: CrossBuildingRoomEndpoint | null;
  startBuilding?: BuildingShape | null;
  destinationRoom?: CrossBuildingRoomEndpoint | null;
  destinationBuilding?: BuildingShape | null;
  buildings: BuildingShape[];
  indoorTravelMode: IndoorRoutePlannerMode;
  outdoorMode: RoutePlannerMode;
};

export type BuildCrossBuildingRouteFlowResult =
  | { ok: true; flow: CrossBuildingRouteFlow }
  | { ok: false; message: string };
