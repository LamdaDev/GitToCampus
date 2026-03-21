import { findIndoorPath, getRoomNodes } from '../src/utils/indoor/indoorPathFinding';
import type { IndoorNode, IndoorEdge } from '../src/utils/indoor/indoorPathFinding';

/* ---------- HELPERS ---------- */

const makeNode = (overrides: Partial<IndoorNode> & { id: string }): IndoorNode => ({
  type: 'room',
  buildingId: 'test-building',
  floor: 1,
  x: 0,
  y: 0,
  label: overrides.id,
  accessible: true,
  ...overrides,
});

const makeEdge = (source: string, target: string, overrides?: Partial<IndoorEdge>): IndoorEdge => ({
  source,
  target,
  type: 'hallway',
  weight: 1,
  accessible: true,
  ...overrides,
});

/* ---------- TESTS ---------- */

describe('findIndoorPath', () => {
  const roomA = makeNode({ id: 'room-a' });
  const roomB = makeNode({ id: 'room-b' });
  const roomC = makeNode({ id: 'room-c' });
  const allRooms = [roomA, roomB, roomC];
  const straightLineEdges = [makeEdge('room-a', 'room-b'), makeEdge('room-b', 'room-c')];

  it('finds a path between two connected rooms', () => {
    const path = findIndoorPath(allRooms, straightLineEdges, 'room-a', 'room-c');
    expect(path?.map((n) => n.id)).toEqual(['room-a', 'room-b', 'room-c']);
  });

  it('works in reverse since edges are bidirectional', () => {
    const path = findIndoorPath(allRooms, straightLineEdges, 'room-c', 'room-a');
    expect(path?.map((n) => n.id)).toEqual(['room-c', 'room-b', 'room-a']);
  });

  it('returns null when rooms are not connected', () => {
    const noEdges: IndoorEdge[] = [];
    expect(findIndoorPath(allRooms, noEdges, 'room-a', 'room-c')).toBeNull();
  });

  it('takes the shorter route when two paths exist', () => {
    const shortcutEdges = [
      makeEdge('room-a', 'room-b', { weight: 1 }),
      makeEdge('room-b', 'room-c', { weight: 1 }),
      makeEdge('room-a', 'room-c', { weight: 10 }),
    ];
    const path = findIndoorPath(allRooms, shortcutEdges, 'room-a', 'room-c');
    expect(path?.map((n) => n.id)).toEqual(['room-a', 'room-b', 'room-c']);
  });

  it('skips inaccessible edges when accessibleOnly is true', () => {
    const inaccessibleEdge = makeEdge('room-a', 'room-b', { accessible: false });
    expect(findIndoorPath([roomA, roomB], [inaccessibleEdge], 'room-a', 'room-b', true)).toBeNull();
  });
});

describe('getRoomNodes', () => {
  const lobbyFloor1 = makeNode({ id: 'lobby', type: 'room', floor: 1, label: 'Lobby' });
  const officeFloor2 = makeNode({ id: 'office', type: 'room', floor: 2, label: 'Office' });
  const hallwayFloor1 = makeNode({ id: 'hallway', type: 'hallway', floor: 1, label: 'Hallway' });
  const unlabeledRoom = makeNode({ id: 'unlabeled', type: 'room', floor: 1, label: '' });
  const allNodes = [lobbyFloor1, officeFloor2, hallwayFloor1, unlabeledRoom];

  it('returns only labeled room nodes', () => {
    const result = getRoomNodes(allNodes);
    expect(result.map((n) => n.id)).toEqual(['lobby', 'office']);
  });

  it('filters to the specified floor', () => {
    const result = getRoomNodes(allNodes, 1);
    expect(result.map((n) => n.id)).toEqual(['lobby']);
  });

  it('returns empty array when no rooms exist on the floor', () => {
    expect(getRoomNodes(allNodes, 99)).toEqual([]);
  });
});
