import type { ShuttlePlan, ShuttlePlanRequest } from '../types/Shuttle';
import { getShuttlePlanStrategy } from './directions/strategies/shuttlePlanStrategy';
import { getNextShuttleDepartures, selectPickupDropoff } from './shuttlePlannerCore';

export { getNextShuttleDepartures, selectPickupDropoff };

export const buildShuttlePlan = (request: ShuttlePlanRequest): ShuttlePlan => {
  const strategy = getShuttlePlanStrategy();
  return strategy.buildPlan(request);
};
