import {
  getFloorPlan,
  getFloorPlanBuildingKeys,
  getFloorPlans,
  getFloorPlansForBuilding,
  hasFloorPlans,
} from '../src/utils/floorPlans';

describe('floorPlans', () => {
  test('builds a fresh catalog with the expected building entries', () => {
    const firstCatalog = getFloorPlans();
    const secondCatalog = getFloorPlans();

    expect(firstCatalog).not.toBe(secondCatalog);
    expect(firstCatalog.H).not.toBe(secondCatalog.H);
    expect(Object.keys(firstCatalog).sort()).toEqual(['CC', 'H', 'MB', 'VE', 'VL']);
    expect(firstCatalog.H['8']).toMatchObject({
      type: 'svg',
      viewBox: { width: 1024, height: 1024 },
    });
    expect(firstCatalog.MB['1']).toMatchObject({
      type: 'png',
    });
  });

  test('reports whether a building has indoor floor plans', () => {
    expect(hasFloorPlans('H')).toBe(true);
    expect(hasFloorPlans('MB')).toBe(true);
    expect(hasFloorPlans('EV')).toBe(false);
    expect(hasFloorPlans('')).toBe(false);
    expect(hasFloorPlans(null)).toBe(false);
    expect(hasFloorPlans(undefined)).toBe(false);
  });

  test('returns floor plans for a known building and null for an unknown one', () => {
    expect(getFloorPlansForBuilding('H')).toMatchObject({
      1: { type: 'svg' },
      8: { type: 'svg' },
    });
    expect(getFloorPlansForBuilding('EV')).toBeNull();
    expect(getFloorPlansForBuilding(null)).toBeNull();
  });

  test('returns floor plans for known levels and null for missing inputs', () => {
    expect(getFloorPlan('H', '8')).toMatchObject({
      type: 'svg',
      viewBox: { width: 1024, height: 1024 },
    });
    expect(getFloorPlan('MB', 'S2')).toMatchObject({
      type: 'png',
    });
    expect(getFloorPlan('H', '999')).toBeNull();
    expect(getFloorPlan('EV', '1')).toBeNull();
    expect(getFloorPlan('H', null)).toBeNull();
    expect(getFloorPlan(undefined, '1')).toBeNull();
  });

  test('returns the supported building keys', () => {
    expect(getFloorPlanBuildingKeys().sort()).toEqual(['CC', 'H', 'MB', 'VE', 'VL']);
  });
});
