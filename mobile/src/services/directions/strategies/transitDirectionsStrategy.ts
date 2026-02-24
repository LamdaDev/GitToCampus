import type { DirectionsRequest, DirectionsRoute } from '../../../types/Directions';
import { fetchGoogleDirectionsRoute } from '../googleDirectionsCore';
import type { DirectionsStrategy, DirectionsStrategyContext } from './DirectionsStrategy';

export class TransitDirectionsStrategy implements DirectionsStrategy {
  readonly mode = 'transit' as const;

  fetchRoute(
    request: DirectionsRequest,
    context: DirectionsStrategyContext,
  ): Promise<DirectionsRoute> {
    return fetchGoogleDirectionsRoute(request, {
      apiKey: context.apiKey,
      mode: this.mode,
      includeTransitInstructions: true,
      fetchImpl: context.fetchImpl,
    });
  }
}

export const transitDirectionsStrategy = new TransitDirectionsStrategy();
