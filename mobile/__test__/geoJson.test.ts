import {
  centroidOfPolygon,
  centroidOfPolygons,
  extractOuterRingsAsLatLngPolygons,
  getFeaturePolygons,
  isPointInAnyPolygon,
  isPointInPolygon,
  isValidRing,
  normalizeCampusCode,
  toLatLng,
} from '../src/utils/geoJson';
import type { GeoJsonFeature, GeoJsonMultiPolygon, GeoJsonPolygon } from '../src/types/GeoJson';

describe('geoJson utils', () => {
  test('toLatLng converts [lng, lat] to { latitude, longitude }', () => {
    expect(toLatLng([-73.57, 45.5])).toEqual({ latitude: 45.5, longitude: -73.57 });
  });

  test('isValidRing requires at least 3 points', () => {
    expect(isValidRing([])).toBe(false);
    expect(isValidRing([[0, 0], [1, 1]])).toBe(false);
    expect(isValidRing([[0, 0], [1, 1], [2, 2]])).toBe(true);
  });

  test('normalizeCampusCode maps SGW/LOY/LOYOLA and rejects others', () => {
    expect(normalizeCampusCode('SGW')).toBe('SGW');
    expect(normalizeCampusCode(' sgw ')).toBe('SGW');
    expect(normalizeCampusCode('LOY')).toBe('LOYOLA');
    expect(normalizeCampusCode('loyola')).toBe('LOYOLA');
    expect(normalizeCampusCode('unknown')).toBeNull();
    expect(normalizeCampusCode(123)).toBeNull();
    expect(normalizeCampusCode({})).toBeNull();
  });

  test('extractOuterRingsAsLatLngPolygons handles Polygon and ignores holes', () => {
    const polygon: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-73.57, 45.5],
          [-73.58, 45.5],
          [-73.58, 45.51],
          [-73.57, 45.5],
        ],
        [
          [-73.575, 45.505],
          [-73.576, 45.505],
          [-73.576, 45.506],
          [-73.575, 45.505],
        ],
      ],
    };

    const polygons = extractOuterRingsAsLatLngPolygons(polygon);
    expect(polygons).toHaveLength(1);
    expect(polygons[0][0]).toEqual({ latitude: 45.5, longitude: -73.57 });
  });

  test('extractOuterRingsAsLatLngPolygons returns [] for Polygon with missing or invalid outer ring', () => {
    const missingOuter: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [],
    };
    const invalidOuter: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [[[-73.57, 45.5], [-73.58, 45.5]]],
    };

    expect(extractOuterRingsAsLatLngPolygons(missingOuter)).toEqual([]);
    expect(extractOuterRingsAsLatLngPolygons(invalidOuter)).toEqual([]);
  });

  test('extractOuterRingsAsLatLngPolygons handles MultiPolygon and skips invalid polygons', () => {
    const multi: GeoJsonMultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [-73.57, 45.5],
            [-73.58, 45.5],
            [-73.58, 45.51],
            [-73.57, 45.5],
          ],
        ],
        [
          [
            [-73.59, 45.52],
            [-73.6, 45.52],
          ],
        ],
        [],
      ],
    };

    const polygons = extractOuterRingsAsLatLngPolygons(multi);
    expect(polygons).toHaveLength(1);
    expect(polygons[0][0]).toEqual({ latitude: 45.5, longitude: -73.57 });
  });

  test('extractOuterRingsAsLatLngPolygons handles malformed MultiPolygon without coordinates', () => {
    const malformed = { type: 'MultiPolygon' } as unknown as GeoJsonMultiPolygon;
    expect(extractOuterRingsAsLatLngPolygons(malformed)).toEqual([]);
  });

  test('getFeaturePolygons returns [] for missing or unsupported geometry', () => {
    const noGeom: GeoJsonFeature = { type: 'Feature', geometry: null, properties: {} };
    const pointGeom: GeoJsonFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-73.57, 45.5] },
      properties: {},
    };

    expect(getFeaturePolygons(noGeom)).toEqual([]);
    expect(getFeaturePolygons(pointGeom)).toEqual([]);
  });

  test('getFeaturePolygons returns polygons for Polygon and MultiPolygon geometry', () => {
    const polygonFeature: GeoJsonFeature = {
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
      properties: {},
    };
    const multiFeature: GeoJsonFeature = {
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
      properties: {},
    };

    expect(getFeaturePolygons(polygonFeature)).toHaveLength(1);
    expect(getFeaturePolygons(multiFeature)).toHaveLength(1);
  });

  test('isPointInPolygon returns false for empty polygon', () => {
    expect(isPointInPolygon({ latitude: 45.5, longitude: -73.57 }, [])).toBe(false);
  });

  test('isPointInPolygon returns true for inside point and false for outside point', () => {
    const polygon = [
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 10 },
      { latitude: 10, longitude: 10 },
      { latitude: 10, longitude: 0 },
    ];

    expect(isPointInPolygon({ latitude: 5, longitude: 5 }, polygon)).toBe(true);
    expect(isPointInPolygon({ latitude: 15, longitude: 15 }, polygon)).toBe(false);
  });

  test('isPointInAnyPolygon returns true if point is inside any polygon', () => {
    const polygons = [
      [
        { latitude: 0, longitude: 0 },
        { latitude: 0, longitude: 2 },
        { latitude: 2, longitude: 2 },
        { latitude: 2, longitude: 0 },
      ],
      [
        { latitude: 5, longitude: 5 },
        { latitude: 5, longitude: 7 },
        { latitude: 7, longitude: 7 },
        { latitude: 7, longitude: 5 },
      ],
    ];

    expect(isPointInAnyPolygon({ latitude: 6, longitude: 6 }, polygons)).toBe(true);
    expect(isPointInAnyPolygon({ latitude: 20, longitude: 20 }, polygons)).toBe(false);
  });

  test('centroidOfPolygon returns null for empty polygons and computes average for valid polygon', () => {
    expect(centroidOfPolygon([])).toBeNull();

    const centroid = centroidOfPolygon([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 4 },
      { latitude: 2, longitude: 2 },
    ]);
    expect(centroid).toEqual({ latitude: 2 / 3, longitude: 2 });
  });

  test('centroidOfPolygons returns null for empty list and centroid of first polygon otherwise', () => {
    expect(centroidOfPolygons([])).toBeNull();

    const centroid = centroidOfPolygons([
      [
        { latitude: 1, longitude: 1 },
        { latitude: 1, longitude: 3 },
        { latitude: 3, longitude: 1 },
      ],
      [
        { latitude: 50, longitude: 50 },
        { latitude: 50, longitude: 60 },
        { latitude: 60, longitude: 50 },
      ],
    ]);
    expect(centroid).toEqual({ latitude: 5 / 3, longitude: 5 / 3 });
  });
});
