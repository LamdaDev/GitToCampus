const vlGraph = require('../src/assets/floor_plans_json/vl_floors_combined.json');
const { findIndoorPath } = require('../src/utils/indoor/indoorPathFinding');

const hasEdge = (source: string, target: string) =>
  vlGraph.edges.some(
    (edge: { source: string; target: string }) =>
      (edge.source === source && edge.target === target) ||
      (edge.source === target && edge.target === source),
  );

describe('VL indoor graph', () => {
  test('keeps the VL-121-2 to VL-140 route on floor 1', () => {
    const path = findIndoorPath(vlGraph.nodes, vlGraph.edges, 'VL_F1_room_87', 'VL_F1_room_77');

    expect(path).not.toBeNull();
    expect(path.every((node: { floor: number }) => node.floor === 1)).toBe(true);
  });

  test('uses a vertical connector for the VL-121-2 to VL-205 route', () => {
    const path = findIndoorPath(vlGraph.nodes, vlGraph.edges, 'VL_F1_room_87', 'VL_F2_room_109');

    expect(path).not.toBeNull();
    expect(path.some((node: { floor: number }) => node.floor === 2)).toBe(true);
    expect(
      path.some(
        (node: { type: string }) => node.type === 'stair_landing' || node.type === 'elevator_door',
      ),
    ).toBe(true);
  });

  test('uses the corrected doorway mappings for the most problematic VL rooms', () => {
    expect(hasEdge('VL_F1_room_126', 'VL_F1_doorway_38')).toBe(true);
    expect(hasEdge('VL_F1_room_126', 'VL_F1_doorway_49')).toBe(false);
    expect(hasEdge('VL_F1_room_101-1', 'VL_F1_doorway_29')).toBe(true);
    expect(hasEdge('VL_F1_room_194-3', 'VL_F1_doorway_55')).toBe(true);
    expect(hasEdge('VL_F2_room_240', 'VL_F2_doorway_67')).toBe(true);
    expect(hasEdge('VL_F2_room_240', 'VL_F2_doorway_70')).toBe(false);
  });
});
