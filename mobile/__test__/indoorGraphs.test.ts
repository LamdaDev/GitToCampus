import { getIndoorGraph } from '../src/utils/indoor/indoorGraphs';

describe('getIndoorGraph', () => {
  test('returns a graph for a supported building alias', () => {
    const graph = getIndoorGraph('Hall');

    expect(graph).not.toBeNull();
    expect(Array.isArray(graph?.nodes)).toBe(true);
    expect(Array.isArray(graph?.edges)).toBe(true);
  });

  test('returns null for an unsupported building alias', () => {
    expect(getIndoorGraph('EV')).toBeNull();
    expect(getIndoorGraph(undefined)).toBeNull();
  });
});
