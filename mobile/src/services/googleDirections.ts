import type { DirectionsRequest, DirectionsRoute } from '../types/Directions';
import { getDirectionsStrategy } from './directions/strategies/directionsStrategyFactory';

export { buildDirectionsApiUrl } from './directions/googleDirectionsCore';

export const fetchOutdoorDirections = async (
  request: DirectionsRequest,
  apiKey: string = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
): Promise<DirectionsRoute> => {
  const mode = request.mode ?? 'walking';
  const strategy = getDirectionsStrategy(mode);

  return strategy.fetchRoute(request, { apiKey });
};
