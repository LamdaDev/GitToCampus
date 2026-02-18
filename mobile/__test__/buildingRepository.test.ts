import type { GeoJsonFeatureCollection } from '../src/types/GeoJson';
import type { BuildingShape } from '../src/types/BuildingShape';

const MOCK_REGIONS = {
  SGW: { latitude: 45.4973, longitude: -73.5789, latitudeDelta: 0.01, longitudeDelta: 0.01 },
  LOYOLA: { latitude: 45.4582, longitude: -73.6405, latitudeDelta: 0.012, longitudeDelta: 0.012 },
};

type Assets = {
  buildingList: GeoJsonFeatureCollection;
  buildingBoundaries: GeoJsonFeatureCollection;
  campusOutlines: GeoJsonFeatureCollection;
};

const baseAssets = (): Assets => ({
  buildingList: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.57, 45.5] },
        properties: {
          unique_id: '1',
          Campus: 'SGW',
          Building: 'MB',
          BuildingName: 'Hall',
          'Building Long Name': 'Hall Building',
          Address: '1455 De Maisonneuve',
          Hotspots: { coffee: 'Second Cup' },
          Services: { security: 'Desk' },
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.64, 45.46] },
        properties: {
          unique_id: 2,
          Campus: 'LOY',
          BuildingName: 'Administration',
          Address: '7141 Sherbrooke',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.6, 45.49] },
        properties: {
          unique_id: ' 3 ',
          Campus: 'LOYOLA',
          Building: 'CC',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.58, 45.5] },
        properties: {
          unique_id: '4',
          Campus: 'SGW',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.61, 45.5] },
        properties: {
          unique_id: '5',
          Campus: 'SGW',
          BuildingName: 'Invalid Geometry Building',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.62, 45.5] },
        properties: {
          unique_id: '6',
          Campus: 'INVALID',
          BuildingName: 'Should Be Skipped',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.63, 45.5] },
        properties: {
          unique_id: '   ',
          Campus: 'SGW',
          BuildingName: 'Blank ID',
        },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.64, 45.5] },
      } as any,
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-73.65, 45.5] },
        properties: {
          unique_id: Number.NaN,
          Campus: 'SGW',
          BuildingName: 'NaN ID',
        },
      },
    ],
  },
  buildingBoundaries: {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.57, 45.5],
              [-73.58, 45.5],
              [-73.58, 45.51],
              [-73.57, 45.5],
            ],
          ],
        },
        properties: { unique_id: '1' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [-73.59, 45.52],
                [-73.6, 45.52],
                [-73.6, 45.53],
                [-73.59, 45.52],
              ],
            ],
          ],
        },
        properties: { unique_id: 2 },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.595, 45.495],
              [-73.596, 45.495],
              [-73.596, 45.496],
              [-73.595, 45.495],
            ],
          ],
        },
        properties: { unique_id: '3' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.585, 45.497],
              [-73.586, 45.497],
              [-73.586, 45.498],
              [-73.585, 45.497],
            ],
          ],
        },
        properties: { unique_id: '4' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.7, 45.6],
              [-73.71, 45.6],
            ],
          ],
        },
        properties: { unique_id: '5' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.8, 45.7],
              [-73.81, 45.7],
              [-73.81, 45.71],
              [-73.8, 45.7],
            ],
          ],
        },
        properties: { unique_id: '999' },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.82, 45.72],
              [-73.83, 45.72],
              [-73.83, 45.73],
              [-73.82, 45.72],
            ],
          ],
        },
        properties: {},
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [-73.84, 45.74],
              [-73.85, 45.74],
              [-73.85, 45.75],
              [-73.84, 45.74],
            ],
          ],
        },
      } as any,
    ],
  },
  campusOutlines: { type: 'FeatureCollection', features: [] },
});

const loadRepository = (
  assets: Assets,
  options?: {
    getFeaturePolygonsMock?: jest.Mock;
  },
) => {
  jest.resetModules();

  const getDistanceMock = jest.fn();
  const isPointInAnyPolygonMock = jest.fn();
  const getCampusRegionMock = jest.fn((campus: 'SGW' | 'LOYOLA') =>
    campus === 'SGW' ? MOCK_REGIONS.SGW : MOCK_REGIONS.LOYOLA,
  );

  jest.doMock('../src/assets/geojson', () => ({ GEOJSON_ASSETS: assets }));
  jest.doMock('geolib', () => ({ getDistance: getDistanceMock }));
  jest.doMock('../src/constants/campuses', () => ({
    ...jest.requireActual('../src/constants/campuses'),
    getCampusRegion: getCampusRegionMock,
  }));
  jest.doMock('../src/utils/geoJson', () => {
    const actual = jest.requireActual('../src/utils/geoJson');
    return {
      ...actual,
      isPointInAnyPolygon: isPointInAnyPolygonMock,
      ...(options?.getFeaturePolygonsMock
        ? { getFeaturePolygons: options.getFeaturePolygonsMock }
        : {}),
    };
  });

  const repo = require('../src/utils/buildingsRepository');
  return { repo, mocks: { getDistanceMock, isPointInAnyPolygonMock, getCampusRegionMock } };
};

describe('buildingsRepository', () => {
  test('joins metadata + boundaries and applies all fallback rules', () => {
    const { repo } = loadRepository(baseAssets());
    const all = repo.getAllBuildingShapes();

    expect(all).toHaveLength(4);
    expect(all.map((b: BuildingShape) => b.id).sort()).toEqual(['1', '2', '3', '4']);

    const building1 = all.find((b: BuildingShape) => b.id === '1');
    const building2 = all.find((b: BuildingShape) => b.id === '2');
    const building3 = all.find((b: BuildingShape) => b.id === '3');
    const building4 = all.find((b: BuildingShape) => b.id === '4');

    expect(building1?.campus).toBe('SGW');
    expect(building1?.name).toBe('Hall Building');
    expect(building1?.shortCode).toBe('MB');
    expect(building1?.address).toBe('1455 De Maisonneuve');
    expect(building1?.hotspots).toEqual({ coffee: 'Second Cup' });
    expect(building1?.services).toEqual({ security: 'Desk' });

    expect(building2?.campus).toBe('LOYOLA');
    expect(building2?.name).toBe('Administration');

    expect(building3?.campus).toBe('LOYOLA');
    expect(building3?.name).toBe('CC');

    expect(building4?.campus).toBe('SGW');
    expect(building4?.name).toBe('Unknown Building');
    expect(building4?.shortCode).toBeUndefined();
    expect(building4?.address).toBeUndefined();
  });

  test('exposes filtered/lookup APIs and uses cache', () => {
    const { repo } = loadRepository(baseAssets());

    const first = repo.getAllBuildingShapes();
    const second = repo.getAllBuildingShapes();
    expect(second).toBe(first);

    const sgw = repo.getCampusBuildingShapes('SGW');
    const loyola = repo.getCampusBuildingShapes('LOYOLA');

    expect(sgw).toHaveLength(2);
    expect(loyola).toHaveLength(2);
    expect(sgw.every((b: BuildingShape) => b.campus === 'SGW')).toBe(true);
    expect(loyola.every((b: BuildingShape) => b.campus === 'LOYOLA')).toBe(true);

    expect(repo.getBuildingShapeById('2')?.name).toBe('Administration');
    expect(repo.getBuildingShapeById('missing-id')).toBeUndefined();
  });

  test('findClosestCampus returns SGW when SGW is closer or tied', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock.mockReturnValueOnce(100).mockReturnValueOnce(100);

    const campus = repo.findClosestCampus({ latitude: 45.49, longitude: -73.57 });

    expect(campus).toBe('SGW');
  });

  test('findClosestCampus returns LOYOLA when Loyola is closer', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock.mockReturnValueOnce(400).mockReturnValueOnce(150);

    const campus = repo.findClosestCampus({ latitude: 45.49, longitude: -73.57 });

    expect(campus).toBe('LOYOLA');
  });

  test('findBuildingAt returns undefined when user is too far from closest campus', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(100) // findClosestCampus: distance to SGW
      .mockReturnValueOnce(300) // findClosestCampus: distance to LOYOLA
      .mockReturnValueOnce(2501); // findBuildingAt: distance to chosen campus

    const building = repo.findBuildingAt({ latitude: 45.8, longitude: -74.0 });

    expect(building).toBeUndefined();
    expect(mocks.isPointInAnyPolygonMock).not.toHaveBeenCalled();
  });

  test('findBuildingAt returns undefined when near campus but outside all campus buildings', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(100) // findClosestCampus: SGW
      .mockReturnValueOnce(500) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(1200); // near campus
    mocks.isPointInAnyPolygonMock.mockReturnValue(false);

    const point = { latitude: 45.498, longitude: -73.579 };
    const building = repo.findBuildingAt(point);

    expect(building).toBeUndefined();
    expect(mocks.isPointInAnyPolygonMock).toHaveBeenCalledTimes(2);
    expect(mocks.isPointInAnyPolygonMock).toHaveBeenNthCalledWith(1, point, expect.any(Array));
  });

  test('findBuildingAt returns matching building when point is inside a campus polygon', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(100) // findClosestCampus: SGW
      .mockReturnValueOnce(500) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(900); // near campus
    mocks.isPointInAnyPolygonMock.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const point = { latitude: 45.498, longitude: -73.579 };
    const building = repo.findBuildingAt(point);

    expect(building?.id).toBe('4');
    expect(building?.campus).toBe('SGW');
  });

  test('findBuildingAt searches Loyola buildings when Loyola is the closest campus', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(600) // findClosestCampus: SGW
      .mockReturnValueOnce(100) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(800); // near Loyola
    mocks.isPointInAnyPolygonMock.mockReturnValueOnce(true);

    const point = { latitude: 45.4585, longitude: -73.6402 };
    const building = repo.findBuildingAt(point);

    expect(building?.campus).toBe('LOYOLA');
    expect(mocks.getCampusRegionMock).toHaveBeenCalledWith('LOYOLA');
  });

  test('findNearestBuildings sorts by distance on the closest campus with default limit', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(100) // findClosestCampus: SGW
      .mockReturnValueOnce(600) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(250) // SGW building 1 centroid
      .mockReturnValueOnce(90); // SGW building 4 centroid

    const results = repo.findNearestBuildings({ latitude: 45.499, longitude: -73.579 });

    expect(results).toHaveLength(2);
    expect(results.map((r: { building: BuildingShape }) => r.building.id)).toEqual(['4', '1']);
    expect(results.map((r: { distance: number }) => r.distance)).toEqual([90, 250]);
  });

  test('findNearestBuildings respects custom limit and nearest-campus selection', () => {
    const { repo, mocks } = loadRepository(baseAssets());
    mocks.getDistanceMock
      .mockReturnValueOnce(700) // findClosestCampus: SGW
      .mockReturnValueOnce(100) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(500) // LOYOLA building 2 centroid
      .mockReturnValueOnce(80); // LOYOLA building 3 centroid

    const results = repo.findNearestBuildings({ latitude: 45.458, longitude: -73.64 }, 1);

    expect(results).toHaveLength(1);
    expect(results[0].building.id).toBe('3');
    expect(results[0].building.campus).toBe('LOYOLA');
    expect(results[0].distance).toBe(80);
  });

  test('findNearestBuildings assigns MAX_VALUE when a building has no first polygon', () => {
    const actualGeoJson = jest.requireActual('../src/utils/geoJson');
    const getFeaturePolygonsMock = jest.fn((feature: any) => {
      const id = feature?.properties?.unique_id;
      if (id === '4') return [undefined];
      return actualGeoJson.getFeaturePolygons(feature);
    });

    const { repo, mocks } = loadRepository(baseAssets(), { getFeaturePolygonsMock });
    mocks.getDistanceMock
      .mockReturnValueOnce(100) // findClosestCampus: SGW
      .mockReturnValueOnce(600) // findClosestCampus: LOYOLA
      .mockReturnValueOnce(120); // SGW building 1 centroid (only valid centroid call)

    const results = repo.findNearestBuildings({ latitude: 45.499, longitude: -73.579 });
    const byId = new Map(
      results.map((r: { building: BuildingShape; distance: number }) => [
        r.building.id,
        r.distance,
      ]),
    );

    expect(byId.get('1')).toBe(120);
    expect(byId.get('4')).toBe(Number.MAX_VALUE);
    expect(mocks.getDistanceMock).toHaveBeenCalledTimes(3);
  });
});
