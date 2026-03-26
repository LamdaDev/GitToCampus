import type { Campus } from '../../types/Campus';
import type { BuildingShape } from '../../types/BuildingShape';

export type IndoorBuildingKey = 'CC' | 'H' | 'MB' | 'VE' | 'VL';

const BUILDING_KEY_TO_CAMPUS: Record<IndoorBuildingKey, Campus> = {
  CC: 'LOYOLA',
  H: 'SGW',
  MB: 'SGW',
  VE: 'LOYOLA',
  VL: 'LOYOLA',
};

const BUILDING_ALIAS_TO_KEY: Record<string, IndoorBuildingKey> = {
  CC: 'CC',
  COMMUNICATIONSTUDIESANDJOURNALISM: 'CC',
  H: 'H',
  HALL: 'H',
  HALLBUILDING: 'H',
  HB: 'H',
  MB: 'MB',
  JOHNMOLSON: 'MB',
  JOHNMOLSONSCHOOLOFBUSINESS: 'MB',
  VE: 'VE',
  ENGINEERINGCOMPUTERSCIENCEANDVISUALARTS: 'VE',
  VL: 'VL',
  VANIERLIBRARY: 'VL',
  VANIER: 'VL',
};

const normalizeToken = (value: string) => value.toUpperCase().replaceAll(/[^A-Z0-9]/g, '');

export const normalizeIndoorBuildingKey = (
  value: string | null | undefined,
): IndoorBuildingKey | null => {
  if (!value) return null;

  const normalized = normalizeToken(value);
  if (!normalized) return null;

  return BUILDING_ALIAS_TO_KEY[normalized] ?? null;
};

export const getIndoorBuildingCampus = (
  buildingKey: IndoorBuildingKey | null | undefined,
): Campus | null => {
  if (!buildingKey) return null;
  return BUILDING_KEY_TO_CAMPUS[buildingKey] ?? null;
};

const getNameCandidates = (name: string): string[] => {
  const trimmed = name.trim();
  if (!trimmed) return [];

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const additionalCandidates = parts.length > 0 ? [parts[0], parts.slice(0, 2).join(' ')] : [];

  return [trimmed, ...additionalCandidates];
};

export const getIndoorBuildingKeyFromShape = (
  building: Pick<BuildingShape, 'shortCode' | 'name'> | null | undefined,
): IndoorBuildingKey | null => {
  if (!building) return null;

  const shortCodeMatch = normalizeIndoorBuildingKey(building.shortCode);
  if (shortCodeMatch) return shortCodeMatch;

  for (const candidate of getNameCandidates(building.name)) {
    const match = normalizeIndoorBuildingKey(candidate);
    if (match) return match;
  }

  return null;
};
