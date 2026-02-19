import { decodePolyline } from '../src/utils/polyline';

describe('decodePolyline', () => {
  test('decodes a valid Google polyline', () => {
    const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

    expect(points).toHaveLength(3);
    expect(points[0].latitude).toBeCloseTo(38.5, 5);
    expect(points[0].longitude).toBeCloseTo(-120.2, 5);
    expect(points[1].latitude).toBeCloseTo(40.7, 5);
    expect(points[1].longitude).toBeCloseTo(-120.95, 5);
    expect(points[2].latitude).toBeCloseTo(43.252, 5);
    expect(points[2].longitude).toBeCloseTo(-126.453, 5);
  });

  test('returns empty array for malformed input', () => {
    expect(decodePolyline('abc')).toEqual([]);
  });

  test('returns empty array for empty input', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  test('decodes a zero-delta point polyline', () => {
    expect(decodePolyline('??')).toEqual([{ latitude: 0, longitude: 0 }]);
  });
});
