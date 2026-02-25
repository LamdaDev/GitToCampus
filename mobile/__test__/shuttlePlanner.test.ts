import {
  buildShuttlePlan,
  getNextShuttleDepartures,
  selectPickupDropoff,
} from '../src/services/shuttlePlanner';
import ShuttleSchedule from '../src/constants/shuttleSchedule';
import { SHUTTLE_STOPS } from '../src/constants/shuttleStops';
import * as locationUtils from '../src/utils/location';

describe('shuttlePlanner service', () => {
  const originalForceUnavailable = process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE;
  const originalSchedule = JSON.parse(JSON.stringify(ShuttleSchedule.schedule));
  const originalStops = SHUTTLE_STOPS.map((stop) => ({
    ...stop,
    coords: { ...stop.coords },
  }));

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE;
  });

  afterEach(() => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = JSON.parse(
      JSON.stringify(originalSchedule['Monday-Thursday']),
    );
    mutableSchedule.Friday = JSON.parse(JSON.stringify(originalSchedule.Friday));

    SHUTTLE_STOPS.splice(
      0,
      SHUTTLE_STOPS.length,
      ...originalStops.map((stop) => ({
        ...stop,
        coords: { ...stop.coords },
      })),
    );
  });

  afterAll(() => {
    if (originalForceUnavailable === undefined) {
      delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE;
    } else {
      process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE = originalForceUnavailable;
    }
  });

  test('returns LOY departures for LOY -> SGW on Monday-Thursday', () => {
    const mondayMorning = new Date(2026, 1, 23, 9, 10, 0, 0);
    const result = getNextShuttleDepartures(mondayMorning, 'LOYOLA_TO_SGW');

    expect(result.isServiceAvailable).toBe(true);
    expect(result.departures).toHaveLength(3);
    expect(result.departures[0].getHours()).toBe(9);
    expect(result.departures[0].getMinutes()).toBe(15);
  });

  test('returns SGW departures for SGW -> LOY on Monday-Thursday', () => {
    const mondayMorning = new Date(2026, 1, 23, 9, 10, 0, 0);
    const result = getNextShuttleDepartures(mondayMorning, 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(true);
    expect(result.departures).toHaveLength(3);
    expect(result.departures[0].getHours()).toBe(9);
    expect(result.departures[0].getMinutes()).toBe(30);
  });

  test('uses Friday schedule and returns only remaining same-day departures', () => {
    const fridayAfternoon = new Date(2026, 1, 20, 16, 40, 0, 0);
    const result = getNextShuttleDepartures(fridayAfternoon, 'LOYOLA_TO_SGW', 5);

    expect(result.isServiceAvailable).toBe(true);
    expect(result.departures.map((departure) => departure.getTime())).toEqual([
      new Date(2026, 1, 20, 16, 45, 0, 0).getTime(),
      new Date(2026, 1, 20, 17, 15, 0, 0).getTime(),
      new Date(2026, 1, 20, 17, 45, 0, 0).getTime(),
    ]);
  });

  test('returns unavailable after last Friday departure time', () => {
    const fridayEvening = new Date(2026, 1, 20, 18, 10, 0, 0);
    const result = getNextShuttleDepartures(fridayEvening, 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('NO_SERVICE_RIGHT_NOW');
    expect(result.departures).toEqual([]);
  });

  test('returns unavailable when no service is scheduled for the day', () => {
    const sundayMorning = new Date(2026, 1, 22, 10, 0, 0, 0);
    const result = getNextShuttleDepartures(sundayMorning, 'LOYOLA_TO_SGW');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('NO_SERVICE_TODAY');
    expect(result.departures).toEqual([]);
  });

  test('selects nearest pickup stop on the start campus when multiple stops exist', () => {
    const result = selectPickupDropoff({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      startCoords: { latitude: 45.4972, longitude: -73.579 },
    });

    expect(result.pickup.campus).toBe('SGW');
    expect(result.dropoff.campus).toBe('LOYOLA');
    expect(result.pickup.id).toBe('sgw-hall');
  });

  test('builds a valid shuttle plan for cross-campus trips', () => {
    const plan = buildShuttlePlan({
      startCampus: 'LOYOLA',
      destinationCampus: 'SGW',
      startCoords: { latitude: 45.4585, longitude: -73.6406 },
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    });

    expect(plan.direction).toBe('LOYOLA_TO_SGW');
    expect(plan.pickup?.campus).toBe('LOYOLA');
    expect(plan.dropoff?.campus).toBe('SGW');
    expect(plan.isServiceAvailable).toBe(true);
    expect(plan.nextDepartureInMinutes).toBe(5);
    expect(plan.nextDepartures.length).toBeGreaterThan(0);
  });

  test('returns a safe message for same-campus routes', () => {
    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'SGW',
      now: new Date(2026, 1, 23, 11, 0, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle service is only available for cross-campus routes.');
  });

  test('returns no-service message outside operating hours', () => {
    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      now: new Date(2026, 1, 23, 23, 45, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle bus unavailable today. Try Public Transit.');
  });

  test('forces unavailable shuttle state when debug override is enabled', () => {
    process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE = 'true';

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('NO_SERVICE_TODAY');
    expect(result.departures).toEqual([]);
  });

  test('parses starred departure tokens as valid times', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: ['9:15***', '9:30'],
    };

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA', 2);

    expect(result.isServiceAvailable).toBe(true);
    expect(result.departures).toHaveLength(2);
    expect(result.departures[0].getHours()).toBe(9);
    expect(result.departures[0].getMinutes()).toBe(15);
    expect(result.departures[1].getHours()).toBe(9);
    expect(result.departures[1].getMinutes()).toBe(30);
  });

  test('returns SCHEDULE_MISSING when day bucket schedule is missing', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = undefined;

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('SCHEDULE_MISSING');
  });

  test('returns SCHEDULE_MISSING when campus departures list is malformed', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: null,
    };

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('SCHEDULE_MISSING');
  });

  test('returns NO_SERVICE_TODAY when departure list is empty', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: [],
    };

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA');

    expect(result.isServiceAvailable).toBe(false);
    expect(result.reason).toBe('NO_SERVICE_TODAY');
  });

  test('ignores malformed departures and deduplicates valid times', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: ['9:15', '9:15', '25:00', 'bad-token', '9:45'],
    };

    const result = getNextShuttleDepartures(new Date(2026, 1, 23, 9, 10, 0, 0), 'SGW_TO_LOYOLA', 5);

    expect(result.isServiceAvailable).toBe(true);
    expect(result.departures).toHaveLength(2);
    expect(result.departures[0].getHours()).toBe(9);
    expect(result.departures[0].getMinutes()).toBe(15);
    expect(result.departures[1].getHours()).toBe(9);
    expect(result.departures[1].getMinutes()).toBe(45);
  });

  test('returns nextDepartureInMinutes as 0 when departure is at current time', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: ['9:10'],
    };

    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(true);
    expect(plan.nextDepartureInMinutes).toBe(0);
  });

  test('selects the closest non-first stop candidate when start is nearer to another stop', () => {
    const result = selectPickupDropoff({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      startCoords: { latitude: 45.49583, longitude: -73.579385 },
    });

    expect(result.pickup.id).toBe('sgw-gm');
    expect(result.dropoff.campus).toBe('LOYOLA');
  });

  test('throws from selectPickupDropoff when stops are missing for either campus', () => {
    SHUTTLE_STOPS.splice(0, SHUTTLE_STOPS.length);

    expect(() =>
      selectPickupDropoff({
        startCampus: 'SGW',
        destinationCampus: 'LOYOLA',
        startCoords: { latitude: 45.497, longitude: -73.579 },
      }),
    ).toThrow('SHUTTLE_STOPS_MISSING');
  });

  test('returns safe fallback message when stop selection fails in buildShuttlePlan', () => {
    SHUTTLE_STOPS.splice(0, SHUTTLE_STOPS.length);

    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle stop information is unavailable. Try Public Transit.');
    expect(plan.nextDepartures).toEqual([]);
  });

  test('returns schedule-missing message in buildShuttlePlan when departures lookup is unavailable', () => {
    const mutableSchedule = ShuttleSchedule.schedule as any;
    mutableSchedule['Monday-Thursday'] = {
      LOY: ['9:15'],
      SGW: null,
    };

    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle schedule is unavailable right now. Try Public Transit.');
    expect(plan.pickup?.campus).toBe('SGW');
    expect(plan.dropoff?.campus).toBe('LOYOLA');
  });

  test('uses default direction when campuses are missing in buildShuttlePlan', () => {
    const plan = buildShuttlePlan({
      startCampus: null,
      destinationCampus: 'LOYOLA',
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    });

    expect(plan.direction).toBe('SGW_TO_LOYOLA');
    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle service is only available for cross-campus routes.');
  });

  test('rethrows unexpected stop-selection errors in buildShuttlePlan', () => {
    jest.spyOn(locationUtils, 'getDistanceMeters').mockImplementation(() => {
      throw new Error('DISTANCE_FAIL');
    });

    expect(() =>
      buildShuttlePlan({
        startCampus: 'SGW',
        destinationCampus: 'LOYOLA',
        startCoords: { latitude: 45.4972, longitude: -73.579 },
        now: new Date(2026, 1, 23, 9, 10, 0, 0),
      }),
    ).toThrow('DISTANCE_FAIL');
  });

  test('uses default current time when now is omitted', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 1, 23, 9, 10, 0, 0));

    const plan = buildShuttlePlan({
      startCampus: 'SGW',
      destinationCampus: 'LOYOLA',
    });

    expect(plan.isServiceAvailable).toBe(true);
    expect(plan.nextDepartures.length).toBeGreaterThan(0);

    jest.useRealTimers();
  });
});
