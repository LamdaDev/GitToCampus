import type { ShuttlePlan, ShuttlePlanRequest } from '../types/Shuttle';
import { getShuttlePlanStrategy } from './directions/strategies/shuttlePlanStrategy';

export { getNextShuttleDepartures, selectPickupDropoff } from './shuttlePlannerCore';

export const buildShuttlePlan = (request: ShuttlePlanRequest): ShuttlePlan => {
  const strategy = getShuttlePlanStrategy();
  return strategy.buildPlan(request);
};
