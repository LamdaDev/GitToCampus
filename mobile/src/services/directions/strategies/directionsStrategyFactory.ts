import type { DirectionsTravelMode } from '../../../types/Directions';
import type { DirectionsStrategy } from './DirectionsStrategy';
import { drivingDirectionsStrategy } from './drivingDirectionsStrategy';
import { transitDirectionsStrategy } from './transitDirectionsStrategy';
import { walkDirectionsStrategy } from './walkDirectionsStrategy';

const STRATEGIES_BY_MODE: Record<DirectionsTravelMode, DirectionsStrategy> = {
  walking: walkDirectionsStrategy,
  driving: drivingDirectionsStrategy,
  transit: transitDirectionsStrategy,
};

export const getDirectionsStrategy = (mode: DirectionsTravelMode): DirectionsStrategy =>
  STRATEGIES_BY_MODE[mode];
