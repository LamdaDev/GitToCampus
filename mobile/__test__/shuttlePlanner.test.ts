import {
  buildShuttlePlan,
  getNextShuttleDepartures,
  selectPickupDropoff,
} from '../src/services/shuttlePlanner';

describe('shuttlePlanner service', () => {
  const originalForceUnavailable = process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE;

  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_SHUTTLE_DEBUG_FORCE_UNAVAILABLE;
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
});
