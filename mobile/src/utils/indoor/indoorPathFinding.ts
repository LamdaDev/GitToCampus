export type IndoorNode = {
  id: string;
  type: string;
  buildingId: string;
  floor: number;
  x: number;
  y: number;
  label: string;
  accessible: boolean;
};

export type IndoorEdge = {
  source: string;
  target: string;
  type: string;
  weight: number;
  accessible: boolean;
};

const buildAdjacency = (
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  accessibleOnly: boolean,
): Map<string, { id: string; weight: number }[]> => {
  const adj = new Map<string, { id: string; weight: number }[]>();
  for (const { id } of nodes) adj.set(id, []);

  for (const { source, target, weight, accessible } of edges) {
    if (accessibleOnly && !accessible) continue;
    adj.get(source)?.push({ id: target, weight });
    adj.get(target)?.push({ id: source, weight }); // bidirectional — hallways work both ways
  }

  return adj;
};

const dijkstra = (
  startId: string,
  endId: string,
  adj: Map<string, { id: string; weight: number }[]>,
  nodeIds: string[],
): Map<string, string | null> => {
  const dist = new Map<string, number>(nodeIds.map((id) => [id, Infinity]));
  const prev = new Map<string, string | null>(nodeIds.map((id) => [id, null]));
  const visited = new Set<string>();

  dist.set(startId, 0);
  const queue: { id: string; d: number }[] = [{ id: startId, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { id } = queue.shift()!;

    if (visited.has(id)) continue;
    visited.add(id);
    if (id === endId) break;

    for (const { id: nbId, weight } of adj.get(id) ?? []) {
      if (visited.has(nbId)) continue;
      const nd = (dist.get(id) ?? Infinity) + weight;
      if (nd < (dist.get(nbId) ?? Infinity)) {
        dist.set(nbId, nd);
        prev.set(nbId, id);
        queue.push({ id: nbId, d: nd });
      }
    }
  }

  return prev;
};

const reconstructPath = (
  endId: string,
  startId: string,
  prev: Map<string, string | null>,
  nodeMap: Map<string, IndoorNode>,
): IndoorNode[] | null => {
  const path: IndoorNode[] = [];
  let cur: string | null = endId;
  while (cur) {
    const n = nodeMap.get(cur);
    if (n) path.unshift(n);
    cur = prev.get(cur) ?? null;
  }
  return path.length > 0 && path[0].id === startId ? path : null;
};

export const findIndoorPath = (
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  endId: string,
  accessibleOnly = false,
): IndoorNode[] | null => {
  const adj = buildAdjacency(nodes, edges, accessibleOnly);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const prev = dijkstra(
    startId,
    endId,
    adj,
    nodes.map((n) => n.id),
  );

  return reconstructPath(endId, startId, prev, nodeMap);
};

export const getRoomNodes = (nodes: IndoorNode[], floor?: number): IndoorNode[] =>
  nodes.filter((n) => n.type === 'room' && n.label && (floor === undefined || n.floor === floor));
