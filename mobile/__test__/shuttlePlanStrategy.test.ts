import { getShuttlePlanStrategy } from '../src/services/directions/strategies/shuttlePlanStrategy';
import { buildDefaultShuttlePlan } from '../src/services/shuttlePlannerCore';

describe('shuttle plan strategy', () => {
  test('default strategy delegates to the existing shuttle planning implementation', () => {
    const request = {
      startCampus: 'LOYOLA' as const,
      destinationCampus: 'SGW' as const,
      startCoords: { latitude: 45.4585, longitude: -73.6406 },
      now: new Date(2026, 1, 23, 9, 10, 0, 0),
    };

    const strategy = getShuttlePlanStrategy();
    const planFromStrategy = strategy.buildPlan(request);
    const expectedPlan = buildDefaultShuttlePlan(request);

    expect(strategy.id).toBe('default');
    expect(planFromStrategy).toEqual(expectedPlan);
  });

  test('default strategy preserves cross-campus guardrail message', () => {
    const strategy = getShuttlePlanStrategy();
    const plan = strategy.buildPlan({
      startCampus: 'SGW',
      destinationCampus: 'SGW',
      now: new Date(2026, 1, 23, 11, 0, 0, 0),
    });

    expect(plan.isServiceAvailable).toBe(false);
    expect(plan.message).toBe('Shuttle service is only available for cross-campus routes.');
  });
});
