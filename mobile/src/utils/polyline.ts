import type { LatLng } from 'react-native-maps';

const decodeNextValue = (
  encoded: string,
  index: number,
): { value: number; index: number } | null => {
  let result = 0;
  let shift = 0;
  let byte: number;

  do {
    if (index >= encoded.length) return null;

    const codePoint = encoded.codePointAt(index++);

    if (codePoint === undefined) return null;

    byte = codePoint - 63;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  const value = result & 1 ? ~(result >> 1) : result >> 1;
  return { value, index };
};

/**
 * Decodes a Google encoded polyline string into LatLng coordinates.
 * Returns [] for empty or malformed input.
 */
export const decodePolyline = (encoded: string): LatLng[] => {
  if (!encoded) return [];

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const points: LatLng[] = [];

  while (index < encoded.length) {
    const latResult = decodeNextValue(encoded, index);
    if (!latResult) return [];
    latitude += latResult.value;
    index = latResult.index;

    const lngResult = decodeNextValue(encoded, index);
    if (!lngResult) return [];
    longitude += lngResult.value;
    index = lngResult.index;

    points.push({
      latitude: latitude * 1e-5,
      longitude: longitude * 1e-5,
    });
  }

  return points;
};
