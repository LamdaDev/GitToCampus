import ShuttleSchedule from '../src/constants/shuttleSchedule';

const DEPARTURE_TOKEN_REGEX = /^(\d{1,2}):(\d{2})$/;

const parseDepartureToken = (token: string) => {
  const match = token.match(DEPARTURE_TOKEN_REGEX);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
};

describe('shuttleSchedule constants', () => {
  test('exposes expected day buckets and campus keys', () => {
    const schedule = ShuttleSchedule.schedule;
    const dayBuckets = Object.keys(schedule).sort();

    expect(dayBuckets).toEqual(['Friday', 'Monday-Thursday']);
    expect(Object.keys(schedule['Monday-Thursday']).sort()).toEqual(['LOY', 'SGW']);
    expect(Object.keys(schedule.Friday).sort()).toEqual(['LOY', 'SGW']);
  });

  test('contains non-empty departures for each day bucket and campus', () => {
    const schedule = ShuttleSchedule.schedule;
    const dayBuckets = Object.keys(schedule) as Array<keyof typeof schedule>;

    for (const dayBucket of dayBuckets) {
      expect(schedule[dayBucket].LOY.length).toBeGreaterThan(0);
      expect(schedule[dayBucket].SGW.length).toBeGreaterThan(0);
    }
  });

  test('all departure tokens are valid H:MM or HH:MM values', () => {
    const schedule = ShuttleSchedule.schedule;
    const dayBuckets = Object.keys(schedule) as Array<keyof typeof schedule>;

    for (const dayBucket of dayBuckets) {
      for (const campus of ['LOY', 'SGW'] as const) {
        for (const token of schedule[dayBucket][campus]) {
          const parsedToken = parseDepartureToken(token);
          expect(parsedToken).not.toBeNull();
          expect(parsedToken!.hour).toBeGreaterThanOrEqual(0);
          expect(parsedToken!.hour).toBeLessThanOrEqual(23);
          expect(parsedToken!.minute).toBeGreaterThanOrEqual(0);
          expect(parsedToken!.minute).toBeLessThanOrEqual(59);
        }
      }
    }
  });

  test('does not contain departures with a trailing star marker', () => {
    const schedule = ShuttleSchedule.schedule;
    const dayBuckets = Object.keys(schedule) as Array<keyof typeof schedule>;

    for (const dayBucket of dayBuckets) {
      for (const campus of ['LOY', 'SGW'] as const) {
        const starredDeparture = schedule[dayBucket][campus].find((token) => token.endsWith('*'));
        expect(starredDeparture).toBeUndefined();
      }
    }
  });

  test('does not contain duplicate departure tokens for any day and campus', () => {
    const schedule = ShuttleSchedule.schedule;
    const dayBuckets = Object.keys(schedule) as Array<keyof typeof schedule>;

    for (const dayBucket of dayBuckets) {
      for (const campus of ['LOY', 'SGW'] as const) {
        const departures = schedule[dayBucket][campus];
        const uniqueDepartures = new Set(departures);
        expect(uniqueDepartures.size).toBe(departures.length);
      }
    }
  });
});
