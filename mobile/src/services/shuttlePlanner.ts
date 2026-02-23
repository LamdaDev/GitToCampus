import type { LatLng } from 'react-native-maps';

import ShuttleSchedule, {
  type ShuttleDepartureCampus,
  type ShuttleScheduleDayBucket,
} from '../constants/shuttleSchedule';
import { SHUTTLE_STOPS, type ShuttleStop } from '../constants/shuttleStops';
import type { Campus } from '../types/Campus';
import type { ShuttleDepartureLookup, ShuttleDirection, ShuttlePlan } from '../types/Shuttle';
import { getDistanceMeters } from '../utils/location';

const DEFAULT_DIRECTION: ShuttleDirection = 'SGW_TO_LOYOLA';
const DEFAULT_DEPARTURE_COUNT = 3;
const NO_SERVICE_MESSAGE = 'Shuttle bus unavailable today. Try Public Transit.';
const SCHEDULE_MISSING_MESSAGE = 'Shuttle schedule is unavailable right now. Try Public Transit.';
const STOPS_MISSING_MESSAGE = 'Shuttle stop information is unavailable. Try Public Transit.';
const CROSS_CAMPUS_ONLY_MESSAGE = 'Shuttle service is only available for cross-campus routes.';

const DEPARTURE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  hour: 'numeric',
  minute: '2-digit',
});

const isShuttleUnavailableDebugEnabled = () =>
  (process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE ?? '').trim().toLowerCase() === 'true';

type SelectPickupDropoffParams = {
  startCampus: Campus;
  destinationCampus: Campus;
  startCoords?: LatLng | null;
};

type BuildShuttlePlanParams = {
  startCampus: Campus | null;
  destinationCampus: Campus | null;
  startCoords?: LatLng | null;
  now?: Date;
  count?: number;
};

const getScheduleDayBucket = (now: Date): ShuttleScheduleDayBucket | null => {
  const day = now.getDay();
  if (day >= 1 && day <= 4) return 'Monday-Thursday';
  if (day === 5) return 'Friday';
  return null;
};

const toDepartureCampus = (direction: ShuttleDirection): ShuttleDepartureCampus =>
  direction === 'SGW_TO_LOYOLA' ? 'SGW' : 'LOY';

const normalizeDepartureToken = (departure: string) => departure.trim().replace(/\*+$/, '');

const parseDeparture = (now: Date, rawDeparture: string): Date | null => {
  const normalizedDeparture = normalizeDepartureToken(rawDeparture);
  const [hourText, minuteText] = normalizedDeparture.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
};

const dedupeDepartures = (departures: Date[]): Date[] => {
  const uniqueDepartures = new Map<number, Date>();
  for (const departure of departures) {
    const departureTime = departure.getTime();
    if (!uniqueDepartures.has(departureTime)) {
      uniqueDepartures.set(departureTime, departure);
    }
  }
  return Array.from(uniqueDepartures.values());
};

const toDirection = (startCampus: Campus, destinationCampus: Campus): ShuttleDirection => {
  if (startCampus === 'SGW' && destinationCampus === 'LOYOLA') return 'SGW_TO_LOYOLA';
  if (startCampus === 'LOYOLA' && destinationCampus === 'SGW') return 'LOYOLA_TO_SGW';
  return DEFAULT_DIRECTION;
};

const getCampusStops = (campus: Campus) => SHUTTLE_STOPS.filter((stop) => stop.campus === campus);

const getClosestStop = (origin: LatLng, stops: ShuttleStop[]): ShuttleStop => {
  return stops.reduce((closestStop, candidateStop) => {
    const candidateDistance = getDistanceMeters(origin, candidateStop.coords);
    const closestDistance = getDistanceMeters(origin, closestStop.coords);
    return candidateDistance < closestDistance ? candidateStop : closestStop;
  }, stops[0]);
};

const formatDepartureTimes = (departures: Date[]) =>
  departures.map((departure) => DEPARTURE_TIME_FORMATTER.format(departure));

const toMinutesUntilDeparture = (now: Date, departure: Date) => {
  const diffMs = departure.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000);
};

const buildUnavailablePlan = (
  direction: ShuttleDirection,
  message: string,
  pickup: ShuttleStop | null = null,
  dropoff: ShuttleStop | null = null,
): ShuttlePlan => ({
  direction,
  pickup,
  dropoff,
  nextDepartures: [],
  nextDepartureDates: [],
  nextDepartureInMinutes: null,
  isServiceAvailable: false,
  message,
});

export const getNextShuttleDepartures = (
  now: Date,
  direction: ShuttleDirection,
  count: number = DEFAULT_DEPARTURE_COUNT,
): ShuttleDepartureLookup => {
  if (isShuttleUnavailableDebugEnabled()) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'NO_SERVICE_TODAY',
    };
  }

  const scheduleDayBucket = getScheduleDayBucket(now);
  if (!scheduleDayBucket) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'NO_SERVICE_TODAY',
    };
  }

  const daySchedule = ShuttleSchedule.schedule[scheduleDayBucket];
  if (!daySchedule) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'SCHEDULE_MISSING',
    };
  }

  const departuresForCampus = daySchedule[toDepartureCampus(direction)];
  if (!Array.isArray(departuresForCampus)) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'SCHEDULE_MISSING',
    };
  }

  if (departuresForCampus.length === 0) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'NO_SERVICE_TODAY',
    };
  }

  const departures = dedupeDepartures(
    departuresForCampus
      .map((departure) => parseDeparture(now, departure))
      .filter((departure): departure is Date => Boolean(departure)),
  )
    .filter((departure) => departure.getTime() >= now.getTime())
    .slice(0, Math.max(1, count));

  if (departures.length === 0) {
    return {
      departures: [],
      isServiceAvailable: false,
      reason: 'NO_SERVICE_RIGHT_NOW',
    };
  }

  return { departures, isServiceAvailable: true };
};

export const selectPickupDropoff = ({
  startCampus,
  destinationCampus,
  startCoords,
}: SelectPickupDropoffParams): { pickup: ShuttleStop; dropoff: ShuttleStop } => {
  const pickupCandidates = getCampusStops(startCampus);
  const dropoffCandidates = getCampusStops(destinationCampus);

  if (pickupCandidates.length === 0 || dropoffCandidates.length === 0) {
    throw new Error('SHUTTLE_STOPS_MISSING');
  }

  const pickup =
    startCoords && pickupCandidates.length > 1
      ? getClosestStop(startCoords, pickupCandidates)
      : pickupCandidates[0];

  const dropoff = dropoffCandidates[0];

  return { pickup, dropoff };
};

export const buildShuttlePlan = ({
  startCampus,
  destinationCampus,
  startCoords,
  now = new Date(),
  count = DEFAULT_DEPARTURE_COUNT,
}: BuildShuttlePlanParams): ShuttlePlan => {
  const direction =
    startCampus && destinationCampus
      ? toDirection(startCampus, destinationCampus)
      : DEFAULT_DIRECTION;

  if (!startCampus || !destinationCampus || startCampus === destinationCampus) {
    return buildUnavailablePlan(direction, CROSS_CAMPUS_ONLY_MESSAGE);
  }

  let pickup: ShuttleStop | null = null;
  let dropoff: ShuttleStop | null = null;

  try {
    const selectedStops = selectPickupDropoff({
      startCampus,
      destinationCampus,
      startCoords: startCoords ?? null,
    });
    pickup = selectedStops.pickup;
    dropoff = selectedStops.dropoff;
  } catch (_error) {
    return buildUnavailablePlan(direction, STOPS_MISSING_MESSAGE);
  }

  const departuresLookup = getNextShuttleDepartures(now, direction, count);
  if (!departuresLookup.isServiceAvailable) {
    const unavailableMessage =
      departuresLookup.reason === 'SCHEDULE_MISSING'
        ? SCHEDULE_MISSING_MESSAGE
        : NO_SERVICE_MESSAGE;

    return buildUnavailablePlan(direction, unavailableMessage, pickup, dropoff);
  }

  const nextDeparture = departuresLookup.departures[0] ?? null;
  const nextDepartureInMinutes = nextDeparture ? toMinutesUntilDeparture(now, nextDeparture) : null;

  return {
    direction,
    pickup,
    dropoff,
    nextDepartures: formatDepartureTimes(departuresLookup.departures),
    nextDepartureDates: departuresLookup.departures,
    nextDepartureInMinutes,
    isServiceAvailable: true,
  };
};
