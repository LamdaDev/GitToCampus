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

const encodeSignedValue = (value: number) => {
  let encodedValue = value < 0 ? ~(value << 1) : value << 1;
  let output = '';

  while (encodedValue >= 0x20) {
    output += String.fromCodePoint((0x20 | (encodedValue & 0x1f)) + 63);
    encodedValue >>= 5;
  }

  output += String.fromCodePoint(encodedValue + 63);
  return output;
};

/**
 * Encodes a sequence of LatLng coordinates into a Google encoded polyline string.
 * Returns an empty string for empty or invalid input.
 */
export const encodePolyline = (coordinates: LatLng[]): string => {
  if (!coordinates.length) return '';

  let previousLatitude = 0;
  let previousLongitude = 0;
  let encoded = '';

  for (const coordinate of coordinates) {
    if (!Number.isFinite(coordinate.latitude) || !Number.isFinite(coordinate.longitude)) {
      return '';
    }

    const latitude = Math.round(coordinate.latitude * 1e5);
    const longitude = Math.round(coordinate.longitude * 1e5);

    encoded += encodeSignedValue(latitude - previousLatitude);
    encoded += encodeSignedValue(longitude - previousLongitude);

    previousLatitude = latitude;
    previousLongitude = longitude;
  }

  return encoded;
};
