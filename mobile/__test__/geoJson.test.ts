import {
  extractOuterRingsAsLatLngPolygons,
  getFeaturePolygons,
  isValidRing,
  normalizeCampusCode,
  toLatLng,
} from '../src/utils/geoJson';
import type { GeoJsonFeature, GeoJsonMultiPolygon, GeoJsonPolygon } from '../src/types/GeoJson';

describe('geoJson utils', () => {
  test('toLatLng converts [lng, lat] to { latitude, longitude }', () => {
    const result = toLatLng([-73.57, 45.5]);
    expect(result).toEqual({ latitude: 45.5, longitude: -73.57 });
  });

  test('isValidRing requires at least 3 points', () => {
    expect(isValidRing([])).toBe(false);
    expect(
      isValidRing([
        [0, 0],
        [1, 1],
      ]),
    ).toBe(false);
    expect(
      isValidRing([
        [0, 0],
        [1, 1],
        [2, 2],
      ]),
    ).toBe(true);
  });

  test('normalizeCampusCode maps SGW/LOY to internal campus codes', () => {
    expect(normalizeCampusCode('SGW')).toBe('SGW');
    expect(normalizeCampusCode(' sgw ')).toBe('SGW');
    expect(normalizeCampusCode('LOY')).toBe('LOYOLA');
    expect(normalizeCampusCode('loyola')).toBe('LOYOLA');
    expect(normalizeCampusCode('unknown')).toBeNull();
    expect(normalizeCampusCode(123)).toBeNull();
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
    expect(polygons[0]).toEqual([
      { latitude: 45.5, longitude: -73.57 },
      { latitude: 45.5, longitude: -73.58 },
      { latitude: 45.51, longitude: -73.58 },
      { latitude: 45.5, longitude: -73.57 },
    ]);
  });

  test('extractOuterRingsAsLatLngPolygons returns [] for invalid rings', () => {
    const polygon: GeoJsonPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-73.57, 45.5],
          [-73.58, 45.5],
        ],
      ],
    };

    expect(extractOuterRingsAsLatLngPolygons(polygon)).toEqual([]);
  });

  test('extractOuterRingsAsLatLngPolygons handles MultiPolygon', () => {
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
            [-73.6, 45.53],
            [-73.59, 45.52],
          ],
        ],
      ],
    };

    const polygons = extractOuterRingsAsLatLngPolygons(multi);
    expect(polygons).toHaveLength(2);
    expect(polygons[0][0]).toEqual({ latitude: 45.5, longitude: -73.57 });
    expect(polygons[1][0]).toEqual({ latitude: 45.52, longitude: -73.59 });
  });

  test('getFeaturePolygons returns [] for missing or unsupported geometry', () => {
    const noGeom: GeoJsonFeature = { type: 'Feature', geometry: null, properties: {} };
    expect(getFeaturePolygons(noGeom)).toEqual([]);

    const point: GeoJsonFeature = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [-73.57, 45.5] },
      properties: {},
    };
    expect(getFeaturePolygons(point)).toEqual([]);
  });

  test('getFeaturePolygons returns polygons for Polygon geometry', () => {
    const feature: GeoJsonFeature = {
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

    const polygons = getFeaturePolygons(feature);
    expect(polygons).toHaveLength(1);
    expect(polygons[0][0]).toEqual({ latitude: 45.5, longitude: -73.57 });
  });
});
