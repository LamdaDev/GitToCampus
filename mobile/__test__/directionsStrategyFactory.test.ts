import type { DirectionsTravelMode } from '../src/types/Directions';
import { getDirectionsStrategy } from '../src/services/directions/strategies/directionsStrategyFactory';

describe('directions strategy factory', () => {
  test('returns a strategy with the matching mode for every supported travel mode', () => {
    const modes: DirectionsTravelMode[] = ['walking', 'driving', 'transit'];

    const selectedModes = modes.map((mode) => getDirectionsStrategy(mode).mode);
    expect(selectedModes).toEqual(modes);
  });

  test('returns stable strategy instances for repeat lookups', () => {
    const walkingStrategyA = getDirectionsStrategy('walking');
    const walkingStrategyB = getDirectionsStrategy('walking');

    expect(walkingStrategyA).toBe(walkingStrategyB);
  });
});
