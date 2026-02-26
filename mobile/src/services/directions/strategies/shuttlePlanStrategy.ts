import type { ShuttlePlan, ShuttlePlanRequest } from '../../../types/Shuttle';
import { buildDefaultShuttlePlan } from '../../shuttlePlannerCore';

export interface ShuttlePlanStrategy {
  readonly id: 'default';
  buildPlan(request: ShuttlePlanRequest): ShuttlePlan;
}

class DefaultShuttlePlanStrategy implements ShuttlePlanStrategy {
  readonly id = 'default' as const;

  buildPlan(request: ShuttlePlanRequest): ShuttlePlan {
    return buildDefaultShuttlePlan(request);
  }
}

type ShuttlePlanStrategyKey = 'default';

const STRATEGIES_BY_KEY: Record<ShuttlePlanStrategyKey, ShuttlePlanStrategy> = {
  default: new DefaultShuttlePlanStrategy(),
};

export const getShuttlePlanStrategy = (
  key: ShuttlePlanStrategyKey = 'default',
): ShuttlePlanStrategy => STRATEGIES_BY_KEY[key];
