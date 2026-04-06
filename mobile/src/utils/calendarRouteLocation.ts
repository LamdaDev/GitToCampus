import { getAllBuildingShapes, findBuildingAt } from './buildingsRepository';
import { getCurrentLocationResult } from './location';
import { getIndoorGraph } from './indoor/indoorGraphs';
import {
  getIndoorBuildingCampus,
  getIndoorBuildingKeyFromShape,
  type IndoorBuildingKey,
} from './indoor/buildingKeys';
import type { BuildingShape } from '../types/BuildingShape';
import type { CrossBuildingRoomEndpoint } from '../types/CrossBuildingRoute';
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
  destinationRoomEndpoint: CrossBuildingRoomEndpoint | null;
  startPoint: CalendarRouteStartPoint;
  normalizedEventLocation: string;
  rawEventLocation: string;
};

export type CalendarEventDestination = Omit<CalendarRouteLocation, 'startPoint'>;

export type CalendarRouteLocationResolveErrorCode =
  | 'MISSING_EVENT_LOCATION'
  | 'UNRECOGNIZED_EVENT_LOCATION';

export type CalendarRouteLocationResult =
  | { type: 'success'; value: CalendarRouteLocation }
  | { type: 'error'; code: CalendarRouteLocationResolveErrorCode; message: string };

export type CalendarEventDestinationResult =
  | { type: 'success'; value: CalendarEventDestination }
  | { type: 'error'; code: CalendarRouteLocationResolveErrorCode; message: string };

export const CALENDAR_LOCATION_NOT_FOUND_MESSAGE =
  'Unable to find route: Location Not Provided/Not Found';

const toCalendarLocationError = (
  code: CalendarRouteLocationResolveErrorCode,
): Extract<CalendarEventDestinationResult, { type: 'error' }> => ({
  type: 'error',
  code,
  message: CALENDAR_LOCATION_NOT_FOUND_MESSAGE,
});

const PUNCTUATION_PATTERN = /[.,;:()[\]{}]/g;
const WHITESPACE_PATTERN = /\s+/g;
const CAMPUS_PREFIX_PATTERN = /\b(SGW|LOY|LOYOLA)\b/g;
const NON_ALPHANUMERIC_PATTERN = /[^A-Z0-9]/g;
const ROOM_LABEL_TOKEN_PATTERN = /[A-Z0-9]+/g;
const ROOM_TOKEN_SEPARATOR_PATTERN = String.raw`[\s.,;:()[\]{}_-]*`;
const REGEX_ESCAPE_REPLACEMENT = String.raw`\$&`;

const normalizeText = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replaceAll(PUNCTUATION_PATTERN, ' ')
    .replaceAll(WHITESPACE_PATTERN, ' ')
    .trim();

const normalizeWithoutCampusPrefix = (value: string) =>
  value.replaceAll(CAMPUS_PREFIX_PATTERN, ' ').replaceAll(WHITESPACE_PATTERN, ' ').trim();

const normalizeCode = (value: string) =>
  value.toUpperCase().replaceAll(NON_ALPHANUMERIC_PATTERN, '');

const escapeRegex = (value: string) =>
  value.replaceAll(/[.*+?^${}()|[\]\\]/g, REGEX_ESCAPE_REPLACEMENT);

const isUppercaseLetter = (char: string) => char >= 'A' && char <= 'Z';
const isDigit = (char: string) => char >= '0' && char <= '9';

const getLeadingLetterPrefix = (value: string): string | null => {
  let index = 0;
  while (index < value.length && isUppercaseLetter(value[index])) {
    index += 1;
  }

  if (index === 0 || index > 5) return null;
  return value.slice(0, index);
};

const isValidRoomSuffix = (value: string): boolean => {
  if (!value) return false;

  let digitsLength = 0;
  while (digitsLength < value.length && isDigit(value[digitsLength])) {
    digitsLength += 1;
  }

  if (digitsLength === 0 || digitsLength > 4) return false;
  const trailing = value.slice(digitsLength);
  if (!trailing) return true;
  return trailing.length === 1 && isUppercaseLetter(trailing);
};

const getRoomCodeFromSeparatedToken = (token: string, nextToken?: string): string | null => {
  const hyphenIndex = token.indexOf('-');
  if (hyphenIndex > 0 && hyphenIndex < token.length - 1) {
    const prefix = getLeadingLetterPrefix(token.slice(0, hyphenIndex));
    const suffix = token.slice(hyphenIndex + 1);
    if (prefix && isValidRoomSuffix(suffix)) {
      return normalizeCode(prefix);
    }
  }

  const prefix = getLeadingLetterPrefix(token);
  if (!prefix || token !== prefix || !nextToken) return null;

  return isValidRoomSuffix(nextToken) ? normalizeCode(prefix) : null;
};

const getRoomCodeFromCompactToken = (token: string): string | null => {
  const prefix = getLeadingLetterPrefix(token);
  if (!prefix) return null;

  const suffix = token.slice(prefix.length);
  if (!isValidRoomSuffix(suffix)) return null;
  return normalizeCode(prefix);
};

const codeFromRoomPattern = (location: string): string | null => {
  const tokens = splitWords(location);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];

    const separatedCode = getRoomCodeFromSeparatedToken(token, nextToken);
    if (separatedCode) return separatedCode;

    // Prefer separated room formats (e.g., "MB S1 150") before compact room formats.
    const shouldSkipCompactMatch = Boolean(nextToken && isValidRoomSuffix(nextToken));
    if (shouldSkipCompactMatch) continue;

    const compactCode = getRoomCodeFromCompactToken(token);
    if (compactCode) return compactCode;
  }

  return null;
};

const splitWords = (value: string): string[] =>
  value
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean);

const isNumericToken = (token: string) => /^\d/.test(token);

const tokenizeForLongNameMatching = (normalizedLocation: string): string[] => {
  const sansCampus = normalizeWithoutCampusPrefix(normalizedLocation);
  return splitWords(sansCampus).filter((token) => !isNumericToken(token));
};

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

let cachedDestinationIndexSource: BuildingShape[] | null = null;
let cachedDestinationIndexes: ReturnType<typeof buildDestinationIndexes> | null = null;

const getDestinationIndexes = () => {
  const buildings = getAllBuildingShapes();
  if (!cachedDestinationIndexes || cachedDestinationIndexSource !== buildings) {
    cachedDestinationIndexSource = buildings;
    cachedDestinationIndexes = buildDestinationIndexes(buildings);
  }

  return cachedDestinationIndexes;
};

const scoreLongNameMatch = ({
  locationTokens,
  firstToken,
  buildingCanonicalName,
}: {
  locationTokens: string[];
  firstToken: string;
  buildingCanonicalName: string;
}): number => {
  if (!buildingCanonicalName) return 0;
  if (!buildingCanonicalName.includes(normalizeCode(firstToken))) return 0;

  let score = 0;
  for (const token of locationTokens) {
    const canonicalToken = normalizeCode(token);
    if (!canonicalToken) continue;
    if (buildingCanonicalName.includes(canonicalToken)) {
      score += 1;
    }
  }
  return score;
};

const matchByLongNameHeuristic = (
  normalizedLocation: string,
  indexes: ReturnType<typeof buildDestinationIndexes>,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  const locationTokens = tokenizeForLongNameMatching(normalizedLocation);
  const firstToken = locationTokens[0];
  if (!firstToken) return null;

  let bestMatch: { building: BuildingShape; score: number } | null = null;

  for (const [canonicalName, building] of indexes.byName.entries()) {
    const score = scoreLongNameMatch({
      locationTokens,
      firstToken,
      buildingCanonicalName: canonicalName,
    });
    if (score <= 0) continue;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { building, score };
    }
  }

  if (!bestMatch) return null;
  return { building: bestMatch.building, method: 'name' };
};

const getShortCodeMatch = (
  code: string,
  indexes: ReturnType<typeof buildDestinationIndexes>,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  if (!code) return null;
  const building = indexes.byShortCode.get(code);
  return building ? { building, method: 'short_code' } : null;
};

const matchByAnyShortCodeToken = (
  tokens: string[],
  indexes: ReturnType<typeof buildDestinationIndexes>,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  for (const token of tokens) {
    const shortCodeMatch = getShortCodeMatch(normalizeCode(token), indexes);
    if (shortCodeMatch) return shortCodeMatch;
  }

  return null;
};

const matchByCanonicalName = (
  canonicalLocation: string,
  indexes: ReturnType<typeof buildDestinationIndexes>,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  if (!canonicalLocation) return null;

  for (const [canonicalName, building] of indexes.byName.entries()) {
    if (canonicalLocation.includes(canonicalName) || canonicalName.includes(canonicalLocation)) {
      return { building, method: 'name' };
    }
  }

  return null;
};

const matchByCanonicalAddress = (
  canonicalLocation: string,
  indexes: ReturnType<typeof buildDestinationIndexes>,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  if (!canonicalLocation) return null;

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

const matchDestinationBuilding = (
  normalizedLocation: string,
): { building: BuildingShape; method: DestinationMatchMethod } | null => {
  const indexes = getDestinationIndexes();
  const tokens = getBuildingSearchTokens(normalizedLocation);
  const firstTokenCode = normalizeCode(tokens[0] ?? '');
  const shouldPreferShortCode = firstTokenCode.length > 0 && firstTokenCode.length <= 2;
  const shouldPreferLongName = firstTokenCode.length >= 4;

  const prioritizedMatches: Array<{
    building: BuildingShape;
    method: DestinationMatchMethod;
  } | null> = [
    getShortCodeMatch(codeFromRoomPattern(normalizedLocation) ?? '', indexes),
    shouldPreferShortCode ? getShortCodeMatch(firstTokenCode, indexes) : null,
    shouldPreferLongName ? matchByLongNameHeuristic(normalizedLocation, indexes) : null,
    matchByAnyShortCodeToken(tokens, indexes),
    matchByLongNameHeuristic(normalizedLocation, indexes),
  ];

  for (const match of prioritizedMatches) {
    if (match) return match;
  }

  const canonicalLocation = normalizeCode(normalizedLocation);
  return (
    matchByCanonicalName(canonicalLocation, indexes) ??
    matchByCanonicalAddress(canonicalLocation, indexes)
  );
};

type RoomLabelCandidate = {
  endpoint: CrossBuildingRoomEndpoint;
  canonicalLabel: string;
  pattern: RegExp;
  tokenCount: number;
  labelLength: number;
};

const roomCandidatesByBuildingKey = new Map<IndoorBuildingKey, RoomLabelCandidate[]>();

const toRoomLabelTokens = (value: string): string[] =>
  value.toUpperCase().match(ROOM_LABEL_TOKEN_PATTERN) ?? [];

const buildRoomLabelPattern = (tokens: string[]) =>
  new RegExp(
    `(^|[^A-Z0-9])${tokens.map((token) => escapeRegex(token)).join(ROOM_TOKEN_SEPARATOR_PATTERN)}(?=$|[^A-Z0-9])`,
    'i',
  );

const getRoomLabelCandidates = (
  destinationBuilding: BuildingShape,
  buildingKey: IndoorBuildingKey,
): RoomLabelCandidate[] => {
  const cachedCandidates = roomCandidatesByBuildingKey.get(buildingKey);
  if (cachedCandidates) return cachedCandidates;

  const graph = getIndoorGraph(buildingKey);
  if (!graph) {
    roomCandidatesByBuildingKey.set(buildingKey, []);
    return [];
  }

  const candidates: RoomLabelCandidate[] = [];
  const seenCanonicalLabels = new Set<string>();
  const roomCampus = getIndoorBuildingCampus(buildingKey) ?? destinationBuilding.campus ?? null;

  for (const node of graph.nodes) {
    if (node.type !== 'room') continue;

    const label = node.label.trim();
    if (!label) continue;

    const canonicalLabel = normalizeCode(label);
    if (!canonicalLabel || seenCanonicalLabels.has(canonicalLabel)) continue;

    const tokens = toRoomLabelTokens(label);
    if (tokens.length < 2) continue;

    candidates.push({
      endpoint: {
        id: node.id,
        label,
        buildingId: node.buildingId,
        buildingKey,
        campus: roomCampus,
        floor: node.floor,
      },
      canonicalLabel,
      pattern: buildRoomLabelPattern(tokens),
      tokenCount: tokens.length,
      labelLength: label.length,
    });
    seenCanonicalLabels.add(canonicalLabel);
  }

  roomCandidatesByBuildingKey.set(buildingKey, candidates);
  return candidates;
};

const scoreRoomLabelCandidate = ({
  candidate,
  uppercaseRawLocation,
  canonicalLocation,
}: {
  candidate: RoomLabelCandidate;
  uppercaseRawLocation: string;
  canonicalLocation: string;
}) => {
  let matchScore = 0;
  if (candidate.pattern.test(uppercaseRawLocation)) matchScore += 3;
  if (canonicalLocation.includes(candidate.canonicalLabel)) matchScore += 2;
  if (canonicalLocation === candidate.canonicalLabel) matchScore += 1;
  if (matchScore === 0) return -1;

  return matchScore * 10_000 + candidate.canonicalLabel.length * 100 + candidate.tokenCount * 10;
};

const resolveDestinationRoomEndpoint = ({
  destinationBuilding,
  rawEventLocation,
  normalizedEventLocation,
}: {
  destinationBuilding: BuildingShape;
  rawEventLocation: string;
  normalizedEventLocation: string;
}): CrossBuildingRoomEndpoint | null => {
  const destinationBuildingKey = getIndoorBuildingKeyFromShape(destinationBuilding);
  if (!destinationBuildingKey) return null;

  const candidates = getRoomLabelCandidates(destinationBuilding, destinationBuildingKey);
  if (candidates.length === 0) return null;

  const uppercaseRawLocation = rawEventLocation.toUpperCase();
  const canonicalLocation = normalizeCode(normalizedEventLocation);

  let bestMatch: { candidate: RoomLabelCandidate; score: number } | null = null;

  for (const candidate of candidates) {
    const score = scoreRoomLabelCandidate({
      candidate,
      uppercaseRawLocation,
      canonicalLocation,
    });
    if (score < 0) continue;

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { candidate, score };
    }
  }

  return bestMatch?.candidate.endpoint ?? null;
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
  if (reason === 'location_unavailable') {
    return 'Could not generate route—try again';
  }
  return '';
};

export const resolveCalendarEventDestination = (
  eventLocation: string | null,
): CalendarEventDestinationResult => {
  if (!eventLocation?.trim()) {
    return toCalendarLocationError('MISSING_EVENT_LOCATION');
  }

  const rawEventLocation = eventLocation.trim();
  const normalizedEventLocation = normalizeText(rawEventLocation);
  const destinationMatch = matchDestinationBuilding(normalizedEventLocation);

  if (!destinationMatch) {
    return toCalendarLocationError('UNRECOGNIZED_EVENT_LOCATION');
  }

  const destinationRoomEndpoint = resolveDestinationRoomEndpoint({
    destinationBuilding: destinationMatch.building,
    rawEventLocation,
    normalizedEventLocation,
  });

  return {
    type: 'success',
    value: {
      destinationBuilding: destinationMatch.building,
      destinationRoomEndpoint,
      normalizedEventLocation,
      rawEventLocation,
    },
  };
};

export const isSupportedCalendarEventLocation = (eventLocation: string | null): boolean =>
  resolveCalendarEventDestination(eventLocation).type === 'success';

export const resolveCalendarRouteLocation = async (
  eventLocation: string | null,
): Promise<CalendarRouteLocationResult> => {
  const destinationResult = resolveCalendarEventDestination(eventLocation);
  if (destinationResult.type === 'error') {
    return destinationResult;
  }

  const startPoint = await resolveStartPoint();

  return {
    type: 'success',
    value: {
      ...destinationResult.value,
      startPoint,
    },
  };
};
