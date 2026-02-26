import type { DirectionsRequest, DirectionsRoute } from '../../../types/Directions';
import { fetchGoogleTransitRoute } from '../googleDirectionsCore';
import type { DirectionsStrategy, DirectionsStrategyContext } from './DirectionsStrategy';

export class TransitDirectionsStrategy implements DirectionsStrategy {
  readonly mode = 'transit' as const;

  fetchRoute(
    request: DirectionsRequest,
    context: DirectionsStrategyContext,
  ): Promise<DirectionsRoute> {
    return fetchGoogleTransitRoute(request, {
      apiKey: context.apiKey,
      fetchImpl: context.fetchImpl,
    });
  }
}

export const transitDirectionsStrategy = new TransitDirectionsStrategy();
