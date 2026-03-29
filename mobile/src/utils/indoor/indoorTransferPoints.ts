import type { IndoorTransferPoint } from '../../types/CrossBuildingRoute';
import { type IndoorBuildingKey } from './buildingKeys';

const INDOOR_TRANSFER_POINTS: Record<IndoorBuildingKey, IndoorTransferPoint> = {
  H: {
    buildingKey: 'H',
    campus: 'SGW',
    accessNodeId: 'Hall_F1_building_entry_exit_3',
    outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
    accessible: true,
  },
  MB: {
    buildingKey: 'MB',
    campus: 'SGW',
    accessNodeId: 'MB_F1_doorway_40',
    outdoorCoords: { latitude: 45.495223, longitude: -73.57916 },
    accessible: true,
  },
  CC: {
    buildingKey: 'CC',
    campus: 'LOYOLA',
    accessNodeId: 'CC_F1_building_entry_exit_5',
    outdoorCoords: { latitude: 45.458282, longitude: -73.640475 },
    accessible: true,
  },
  VE: {
    buildingKey: 'VE',
    campus: 'LOYOLA',
    accessNodeId: 'VE_F1_building_entry_exit_6',
    outdoorCoords: { latitude: 45.459026, longitude: -73.638606 },
    accessible: true,
  },
  VL: {
    buildingKey: 'VL',
    campus: 'LOYOLA',
    accessNodeId: 'VL_F1_doorway_35',
    outdoorCoords: { latitude: 45.459044, longitude: -73.638305 },
    accessible: true,
  },
};

export const getIndoorTransferPoint = (
  buildingKey: IndoorBuildingKey | null | undefined,
): IndoorTransferPoint | null => {
  if (!buildingKey) return null;
  return INDOOR_TRANSFER_POINTS[buildingKey] ?? null;
};
