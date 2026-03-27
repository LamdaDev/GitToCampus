import type { Campus } from '../../types/Campus';
import type { IndoorBuildingKey } from './buildingKeys';

type IndoorBuildingMetadata = {
  name: string;
  address: string;
  campus: Campus;
};

export const indoorBuildingMetadata: Readonly<Record<IndoorBuildingKey, IndoorBuildingMetadata>> = {
  CC: {
    name: 'CC Building',
    address: '7141 Sherbrooke West',
    campus: 'LOYOLA',
  },
  H: {
    name: 'H Building',
    address: '1450 De Maisonneuve Blvd W.',
    campus: 'SGW',
  },
  MB: {
    name: 'MB Building',
    address: '1450 Guy Street',
    campus: 'SGW',
  },
  VE: {
    name: 'VE Building',
    address: '7141 Sherbrooke West',
    campus: 'LOYOLA',
  },
  VL: {
    name: 'Vanier Library',
    address: '7141 Sherbrooke St W.',
    campus: 'LOYOLA',
  },
};

export const indoorBuildingKeys = Object.keys(indoorBuildingMetadata) as IndoorBuildingKey[];

export const getIndoorBuildingKeysWithMetadata = (
  floorPlanLookup: Record<string, unknown>,
): IndoorBuildingKey[] =>
  Object.keys(floorPlanLookup).filter((buildingKey): buildingKey is IndoorBuildingKey =>
    Object.prototype.hasOwnProperty.call(indoorBuildingMetadata, buildingKey),
  );

