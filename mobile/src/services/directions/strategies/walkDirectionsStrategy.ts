import type { DirectionsRequest, DirectionsRoute } from '../../../types/Directions';
import { fetchGoogleDirectionsRoute } from '../googleDirectionsCore';
import type { DirectionsStrategy, DirectionsStrategyContext } from './DirectionsStrategy';

export class WalkDirectionsStrategy implements DirectionsStrategy {
  readonly mode = 'walking' as const;

  fetchRoute(
    request: DirectionsRequest,
    context: DirectionsStrategyContext,
  ): Promise<DirectionsRoute> {
    return fetchGoogleDirectionsRoute(request, {
      apiKey: context.apiKey,
      mode: this.mode,
      fetchImpl: context.fetchImpl,
    });
  }
}

export const walkDirectionsStrategy = new WalkDirectionsStrategy();
