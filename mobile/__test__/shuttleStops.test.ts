import { SHUTTLE_STOPS } from '../src/constants/shuttleStops';

describe('shuttleStops constants', () => {
  test('defines shuttle stops for both campuses', () => {
    const campuses = new Set(SHUTTLE_STOPS.map((stop) => stop.campus));

    expect(campuses.has('SGW')).toBe(true);
    expect(campuses.has('LOYOLA')).toBe(true);
  });

  test('contains exactly one stop per campus', () => {
    const sgwStops = SHUTTLE_STOPS.filter((stop) => stop.campus === 'SGW');
    const loyolaStops = SHUTTLE_STOPS.filter((stop) => stop.campus === 'LOYOLA');

    expect(sgwStops).toHaveLength(1);
    expect(loyolaStops).toHaveLength(1);
  });

  test('has unique stop ids and non-empty names', () => {
    const ids = SHUTTLE_STOPS.map((stop) => stop.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
    for (const stop of SHUTTLE_STOPS) {
      expect(stop.name.trim().length).toBeGreaterThan(0);
    }
  });

  test('coordinates are valid latitude/longitude values around Montreal', () => {
    for (const stop of SHUTTLE_STOPS) {
      expect(stop.coords.latitude).toBeGreaterThanOrEqual(45);
      expect(stop.coords.latitude).toBeLessThanOrEqual(46);
      expect(stop.coords.longitude).toBeGreaterThanOrEqual(-74);
      expect(stop.coords.longitude).toBeLessThanOrEqual(-73);
    }
  });

  test('includes known canonical stop ids used by shuttle planner/tests', () => {
    const ids = new Set(SHUTTLE_STOPS.map((stop) => stop.id));

    expect(ids.has('sgw-hall')).toBe(true);
    expect(ids.has('loy-ad')).toBe(true);
  });
});
