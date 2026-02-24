import type {
  DirectionsRequest,
  DirectionsRoute,
  DirectionsTravelMode,
} from '../../../types/Directions';

export type DirectionsStrategyContext = {
  apiKey: string;
  fetchImpl?: typeof fetch;
};

export interface DirectionsStrategy {
  readonly mode: DirectionsTravelMode;
  fetchRoute(
    request: DirectionsRequest,
    context: DirectionsStrategyContext,
  ): Promise<DirectionsRoute>;
}
