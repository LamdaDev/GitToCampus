import type { GeoJsonFeatureCollection } from '../src/types/GeoJson';
import type { BuildingShape } from '../src/types/BuildingShape';

const loadRepositoryWithAssets = (assets: {
  buildingList: GeoJsonFeatureCollection;
  buildingBoundaries: GeoJsonFeatureCollection;
  campusOutlines: GeoJsonFeatureCollection;
}) => {
  jest.resetModules();
  jest.doMock('../src/assets/geojson', () => ({ GEOJSON_ASSETS: assets }));
  // Use require to avoid Node ESM dynamic import requirements in Jest.

  return require('../src/utils/buildingsRepository');
};

describe('buildingsRepository', () => {
  const baseAssets = () => {
    const buildingList: GeoJsonFeatureCollection = {
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
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-73.64, 45.46] },
          properties: {
            unique_id: 2,
            Campus: 'LOY',
            Building: 'AD',
            BuildingName: 'Administration',
            Address: '7141 Sherbrooke',
          },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-73.64, 45.46] },
          properties: {
            unique_id: '3',
            Campus: 'INVALID',
            Building: 'XX',
          },
        },
      ],
    };

    const buildingBoundaries: GeoJsonFeatureCollection = {
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
              [
                [
                  [-73.61, 45.54],
                  [-73.62, 45.54],
                  [-73.62, 45.55],
                  [-73.61, 45.54],
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
                [-73.7, 45.6],
                [-73.71, 45.6],
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
                [-73.8, 45.7],
                [-73.81, 45.7],
                [-73.81, 45.71],
                [-73.8, 45.7],
              ],
            ],
          },
          properties: { unique_id: '999' },
        },
      ],
    };

    const campusOutlines: GeoJsonFeatureCollection = {
      type: 'FeatureCollection',
      features: [],
    };

    return { buildingList, buildingBoundaries, campusOutlines };
  };

  test('joins metadata + boundaries and returns only valid buildings', () => {
    const repo = loadRepositoryWithAssets(baseAssets());
    const all = repo.getAllBuildingShapes();

    expect(all).toHaveLength(2);
    expect(all.map((b: BuildingShape) => b.id).sort()).toEqual(['1', '2']);

    const sgw = all.find((b: BuildingShape) => b.id === '1');
    expect(sgw?.campus).toBe('SGW');
    expect(sgw?.name).toBe('Hall Building');
    expect(sgw?.shortCode).toBe('MB');
    expect(sgw?.address).toBe('1455 De Maisonneuve');
  });

  test('normalizes Loyola campus code and handles MultiPolygon', () => {
    const repo = loadRepositoryWithAssets(baseAssets());
    const all = repo.getAllBuildingShapes();

    const loyola = all.find((b: BuildingShape) => b.id === '2');
    expect(loyola?.campus).toBe('LOYOLA');
    expect(loyola?.name).toBe('Administration');
    expect(loyola?.polygons).toHaveLength(2);
  });

  test('getCampusBuildingShapes filters by campus', () => {
    const repo = loadRepositoryWithAssets(baseAssets());
    const sgw = repo.getCampusBuildingShapes('SGW');
    const loyola = repo.getCampusBuildingShapes('LOYOLA');

    expect(sgw).toHaveLength(1);
    expect(loyola).toHaveLength(1);
    expect(sgw[0].campus).toBe('SGW');
    expect(loyola[0].campus).toBe('LOYOLA');
  });

  test('getBuildingShapeById returns undefined for missing id', () => {
    const repo = loadRepositoryWithAssets(baseAssets());
    expect(repo.getBuildingShapeById('does-not-exist')).toBeUndefined();
  });

  test('getAllBuildingShapes uses a cache (same reference)', () => {
    const repo = loadRepositoryWithAssets(baseAssets());
    const first = repo.getAllBuildingShapes();
    const second = repo.getAllBuildingShapes();
    expect(second).toBe(first);
  });
});
