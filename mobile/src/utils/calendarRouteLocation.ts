import { getAllBuildingShapes, findBuildingAt } from './buildingsRepository';
import { getCurrentLocationResult } from './location';
import type { BuildingShape } from '../types/BuildingShape';
import type { UserLocationCoords } from './location';

type DestinationMatchMethod = 'short_code' | 'name' | 'address';
type ManualStartReason = 'permission_denied' | 'location_unavailable' | 'outside_campus';

type AutomaticStartPoint = {
  type: 'automatic';
  coordinates: UserLocationCoords;
  building: BuildingShape | null;
};

type ManualStartPoint = {
  type: 'manual';
  reason: ManualStartReason;
  coordinates?: UserLocationCoords;
};

export type CalendarRouteStartPoint = AutomaticStartPoint | ManualStartPoint;

export type CalendarRouteLocation = {
  destinationBuilding: BuildingShape;
  startPoint: CalendarRouteStartPoint;
  normalizedEventLocation: string;
  rawEventLocation: string;
};

export type CalendarRouteLocationResolveErrorCode =
  | 'MISSING_EVENT_LOCATION'
  | 'UNRECOGNIZED_EVENT_LOCATION';

export type CalendarRouteLocationResult =
  | { type: 'success'; value: CalendarRouteLocation }
  | { type: 'error'; code: CalendarRouteLocationResolveErrorCode; message: string };

const normalizeText = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[.,;:()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeWithoutCampusPrefix = (value: string) =>
  value.replace(/\b(SGW|LOY|LOYOLA)\b/g, ' ').replace(/\s+/g, ' ').trim();

const normalizeCode = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

const codeFromRoomPattern = (location: string): string | null => {
  const match = location.match(/\b([A-Z]{1,5})\s*[- ]\s*\d{1,4}[A-Z]?\b/);
  if (!match?.[1]) return null;
  return normalizeCode(match[1]);
};

const splitWords = (value: string): string[] =>
  value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

const getBuildingSearchTokens = (normalizedLocation: string): string[] => {
  const sansCampus = normalizeWithoutCampusPrefix(normalizedLocation);
  const tokens = splitWords(sansCampus);
  return tokens;
};

const buildDestinationIndexes = (buildings: BuildingShape[]) => {
  const byShortCode = new Map<string, BuildingShape>();
  const byName = new Map<string, BuildingShape>();
  const byAddress = new Map<string, BuildingShape>();

  for (const building of buildings) {
    if (building.shortCode) {
      byShortCode.set(normalizeCode(building.shortCode), building);
    }

    const normalizedName = normalizeCode(building.name);
    if (normalizedName) byName.set(normalizedName, building);

    const normalizedAddress = normalizeCode(building.address ?? '');
    if (normalizedAddress) byAddress.set(normalizedAddress, building);
  }

  return { byShortCode, byName, byAddress };
};

const matchDestinationBuilding = (
  normalizedLocation: string,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  const buildings = getAllBuildingShapes();
  const indexes = buildDestinationIndexes(buildings);
  const tokens = getBuildingSearchTokens(normalizedLocation);

  const roomCodeHint = codeFromRoomPattern(normalizedLocation);
  if (roomCodeHint) {
    const building = indexes.byShortCode.get(roomCodeHint);
    if (building) return { building, method: 'short_code' };
  }

  for (const token of tokens) {
    const shortCodeMatch = indexes.byShortCode.get(normalizeCode(token));
    if (shortCodeMatch) return { building: shortCodeMatch, method: 'short_code' };
  }

  const canonicalLocation = normalizeCode(normalizedLocation);
  if (!canonicalLocation) return null;

  for (const [canonicalName, building] of indexes.byName.entries()) {
    if (canonicalLocation.includes(canonicalName) || canonicalName.includes(canonicalLocation)) {
      return { building, method: 'name' };
    }
  }

  for (const [canonicalAddress, building] of indexes.byAddress.entries()) {
    if (
      canonicalAddress &&
      (canonicalLocation.includes(canonicalAddress) || canonicalAddress.includes(canonicalLocation))
    ) {
      return { building, method: 'address' };
    }
  }

  return null;
};

const resolveStartPoint = async (): Promise<CalendarRouteStartPoint> => {
  const currentLocationResult = await getCurrentLocationResult();

  if (currentLocationResult.type === 'permission_denied') {
    return { type: 'manual', reason: 'permission_denied' };
  }
  if (currentLocationResult.type === 'unavailable') {
    return { type: 'manual', reason: 'location_unavailable' };
  }

  const coordinates = currentLocationResult.coords;
  const containingBuilding = findBuildingAt(coordinates) ?? null;

  if (!containingBuilding) {
    return { type: 'manual', reason: 'outside_campus', coordinates };
  }

  return {
    type: 'automatic',
    coordinates,
    building: containingBuilding,
  };
};

export const getManualStartReasonMessage = (reason: ManualStartReason): string => {
  if (reason === 'permission_denied') {
    return 'Location permission required—please select your starting building manually';
  }
  if (reason === 'location_unavailable') {
    return 'Could not generate route—try again';
  }
  return 'Location permission required—please select your starting building manually';
};

export const resolveCalendarRouteLocation = async (
  eventLocation: string | null,
): Promise<CalendarRouteLocationResult> => {
  if (!eventLocation || !eventLocation.trim()) {
    return {
      type: 'error',
      code: 'MISSING_EVENT_LOCATION',
      message: 'No location found for this event—please update your calendar',
    };
  }

  const rawEventLocation = eventLocation.trim();
  const normalizedEventLocation = normalizeText(rawEventLocation);
  const destinationMatch = matchDestinationBuilding(normalizedEventLocation);

  if (!destinationMatch) {
    return {
      type: 'error',
      code: 'UNRECOGNIZED_EVENT_LOCATION',
      message: 'Could not generate route—try again',
    };
  }

  const startPoint = await resolveStartPoint();

  return {
    type: 'success',
    value: {
      destinationBuilding: destinationMatch.building,
      startPoint,
      normalizedEventLocation,
      rawEventLocation,
    },
  };
};
