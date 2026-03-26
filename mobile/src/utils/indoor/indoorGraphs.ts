import hallGraph from '../../assets/floor_plans_json/hall.json';
import ccGraph from '../../assets/floor_plans_json/cc1.json';
import mbGraph from '../../assets/floor_plans_json/mb_floors_combined.json';
import veGraph from '../../assets/floor_plans_json/ve.json';
import vlGraph from '../../assets/floor_plans_json/vl_floors_combined.json';

import type { IndoorEdge, IndoorNode } from './indoorPathFinding';
import { normalizeIndoorBuildingKey, type IndoorBuildingKey } from './buildingKeys';

export type IndoorGraph = {
  nodes: IndoorNode[];
  edges: IndoorEdge[];
};

const BUILDING_GRAPHS: Record<IndoorBuildingKey, IndoorGraph> = {
  H: hallGraph as unknown as IndoorGraph,
  CC: ccGraph as unknown as IndoorGraph,
  MB: mbGraph as unknown as IndoorGraph,
  VE: veGraph as unknown as IndoorGraph,
  VL: vlGraph as unknown as IndoorGraph,
};

export const getIndoorGraph = (buildingKeyOrAlias: string | null | undefined): IndoorGraph | null => {
  const buildingKey = normalizeIndoorBuildingKey(buildingKeyOrAlias);
  if (!buildingKey) return null;

  return BUILDING_GRAPHS[buildingKey] ?? null;
};
