import type { LatLng } from 'react-native-maps';

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
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      if (index >= encoded.length) return [];
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({
      latitude: latitude * 1e-5,
      longitude: longitude * 1e-5,
    });
  }

  return points;
};
