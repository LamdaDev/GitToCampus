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

export type PathOptions = {
  accessibleOnly?: boolean;
  preferElevators?: boolean;
};

const buildAdjacency = (
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  accessibleOnly: boolean,
  preferElevators: boolean,
): Map<string, { id: string; weight: number }[]> => {
  const adj = new Map<string, { id: string; weight: number }[]>();
  for (const { id } of nodes) adj.set(id, []);

  for (const { source, target, weight, accessible, type } of edges) {
    if (accessibleOnly && !accessible) continue;
    if (preferElevators && type === 'stair') continue;
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
  const distFromStart = new Map<string, number>(nodeIds.map((id) => [id, Infinity]));
  const prevNodes = new Map<string, string | null>(nodeIds.map((id) => [id, null]));
  const visitedNodes = new Set<string>();

  distFromStart.set(startId, 0);
  const unvisitedQueue: { id: string; distance: number }[] = [{ id: startId, distance: 0 }];

  while (unvisitedQueue.length > 0) {
    unvisitedQueue.sort((NodeA, NodeB) => NodeA.distance - NodeB.distance);
    const { id: currentNodeId } = unvisitedQueue.shift()!;

    if (visitedNodes.has(currentNodeId)) continue;
    visitedNodes.add(currentNodeId);
    if (currentNodeId === endId) break;

    for (const { id: neighbourId, weight } of adj.get(currentNodeId) ?? []) {
      if (visitedNodes.has(neighbourId)) continue;
      const newDistance = (distFromStart.get(currentNodeId) ?? Infinity) + weight;
      if (newDistance < (distFromStart.get(neighbourId) ?? Infinity)) {
        distFromStart.set(neighbourId, newDistance);
        prevNodes.set(neighbourId, currentNodeId);
        unvisitedQueue.push({ id: neighbourId, distance: newDistance });
      }
    }
  }

  return prevNodes;
};

const reconstructPath = (
  endId: string,
  startId: string,
  prevNode: Map<string, string | null>,
  nodeMap: Map<string, IndoorNode>,
): IndoorNode[] | null => {
  const path: IndoorNode[] = [];
  let currentNodeId: string | null = endId;
  while (currentNodeId) {
    const node = nodeMap.get(currentNodeId);
    if (node) path.unshift(node);
    currentNodeId = prevNode.get(currentNodeId) ?? null;
  }
  return path.length > 0 && path[0].id === startId ? path : null;
};

export const findIndoorPath = (
  nodes: IndoorNode[],
  edges: IndoorEdge[],
  startId: string,
  endId: string,
  { accessibleOnly = false, preferElevators = false }: PathOptions = {},
): IndoorNode[] | null => {
  const adj = buildAdjacency(nodes, edges, accessibleOnly, preferElevators);
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const prevNode = dijkstra(
    startId,
    endId,
    adj,
    nodes.map((node) => node.id),
  );

  return reconstructPath(endId, startId, prevNode, nodeMap);
};

export const getRoomNodes = (nodes: IndoorNode[], floor?: number): IndoorNode[] =>
  nodes.filter(
    (node) => node.type === 'room' && node.label && (floor === undefined || node.floor === floor),
  );
