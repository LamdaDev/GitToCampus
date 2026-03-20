import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import IndoorControls from '../components/indoor/IndoorControls';
import { BuildingShape } from '../types/BuildingShape';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { floorPlans } from '../utils/floorPlans';
import IndoorBottomSheet, { IndoorBottomSheetRef } from '../components/indoor/BuildingListSheet';
import PathOverlay from '../components/indoor/PathOverlay';
import RoomSelectorModal from '../components/indoor/RoomSelectorModal';
import {
  findIndoorPath,
  getRoomNodes,
  type IndoorNode,
  type IndoorEdge,
} from '../utils/indoor/indoorPathFinding';
import hallGraph from '../assets/floor_plans_json/hall.json';
import ccGraph from '../assets/floor_plans_json/cc1.json';
import mbGraph from '../assets/floor_plans_json/mb_floors_combined.json';
import veGraph from '../assets/floor_plans_json/ve.json';
import vlGraph from '../assets/floor_plans_json/vl_floors_combined.json';

const containerStyle = { ...StyleSheet.absoluteFillObject, backgroundColor: 'white' };

type props = {
  onExitIndoor: () => void;
  onOpenCalendar?: () => void;
  hideAppSearchBar: () => void;
  revealSearchBar: () => void;
  building: BuildingShape;
  externalStartRoomId?: string | null;
  externalEndRoomId?: string | null;
};

const BUILDING_GRAPHS: Record<string, { nodes: IndoorNode[]; edges: IndoorEdge[] }> = {
  H: hallGraph as unknown as { nodes: IndoorNode[]; edges: IndoorEdge[] },
  CC: ccGraph as unknown as { nodes: IndoorNode[]; edges: IndoorEdge[] },
  MB: mbGraph as unknown as { nodes: IndoorNode[]; edges: IndoorEdge[] },
  VE: veGraph as unknown as { nodes: IndoorNode[]; edges: IndoorEdge[] },
  VL: vlGraph as unknown as { nodes: IndoorNode[]; edges: IndoorEdge[] },
};

const NODE_SPACES: Record<string, { width: number; height: number }> = {
  H:  { width: 2040, height: 2040 }, // actual recorded node space from console log
  CC: { width: 4096, height: 1024 },
  VE: { width: 1623, height: 622 },
  MB: { width: 949, height: 977 },
  VL: { width: 831, height: 940 },
};

const SVG_VIEWBOXES: Record<string, { width: number; height: number }> = {
  H:  { width: 1024, height: 1024 },
  CC: { width: 4096, height: 1024 },
  VE: { width: 1024, height: 1024 },
  MB: { width: 1000, height: 1000 },
  VL: { width: 1000, height: 1000 },
};

const getPathSteps = (path: IndoorNode[]) => {
  const steps: { icon: string; label: string }[] = [];
  let prevFloor = path[0]?.floor;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];
    const prev = path[i - 1];

    if (node.type === 'elevator_door' || prev.type === 'elevator_door') {
      if (node.floor !== prevFloor) {
        steps.push({ icon: '🛗', label: `Elevator to floor ${node.floor}` });
        prevFloor = node.floor;
      }
    } else if (node.type === 'stair_landing' || prev.type === 'stair_landing') {
      if (node.floor !== prevFloor) {
        steps.push({ icon: '🪜', label: `Stairs to floor ${node.floor}` });
        prevFloor = node.floor;
      }
    }
  }

  const start = path[0];
  const end = path[path.length - 1];
  steps.unshift({
    icon: '🟢',
    label: `Start: ${start.label || start.type} (Floor ${start.floor})`,
  });
  steps.push({ icon: '🔴', label: `End: ${end.label || end.type} (Floor ${end.floor})` });

  return steps;
};

export default function IndoorMapScreen({
  onExitIndoor,
  onOpenCalendar,
  hideAppSearchBar,
  revealSearchBar,
  building,
  externalStartRoomId,
  externalEndRoomId,
}: Readonly<props>) {
  const bottomSheetRef = useRef<IndoorBottomSheetRef>(null);

  const [isIndoorSheetOpen, setIndoorSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(building);
  const [currentFloor, setCurrentFloor] = useState<string | null>(null);

  // ── Path state ──────────────────────────────────────────────────────────────
  const [startRoomId, setStartRoomId] = useState<string | null>(null);
  const [endRoomId, setEndRoomId] = useState<string | null>(null);
  const [selectorTarget, setSelectorTarget] = useState<'start' | 'end' | null>(null);

  const buildingGraph = useMemo(() => {
    const code = selectedBuilding?.shortCode;
    const graph = code ? (BUILDING_GRAPHS[code] ?? null) : null;
    if (graph) {
      const xs = graph.nodes.map((n: IndoorNode) => n.x);
      const ys = graph.nodes.map((n: IndoorNode) => n.y);
      console.log('nodeMaxX:', Math.max(...xs), 'nodeMaxY:', Math.max(...ys));
    }
    return graph;
  }, [selectedBuilding?.shortCode]);

  const allRooms = useMemo(() => {
    if (!buildingGraph) return [];
    const connectedIds = new Set(buildingGraph.edges.flatMap((e) => [e.source, e.target]));
    return getRoomNodes(buildingGraph.nodes).filter((n) => connectedIds.has(n.id));
  }, [buildingGraph]);

  const fullPath = useMemo(() => {
    if (!startRoomId || !endRoomId || !buildingGraph) return null;

    const startEdges = buildingGraph.edges.filter(
      (e) => e.source === startRoomId || e.target === startRoomId,
    );
    const endEdges = buildingGraph.edges.filter(
      (e) => e.source === endRoomId || e.target === endRoomId,
    );
    console.log('start edges:', startEdges.length, 'end edges:', endEdges.length);

    const result = findIndoorPath(buildingGraph.nodes, buildingGraph.edges, startRoomId, endRoomId);
    console.log(
      'fullPath result:',
      result?.length,
      'nodes',
      'start:',
      startRoomId,
      'end:',
      endRoomId,
    );
    return result;
  }, [startRoomId, endRoomId, buildingGraph]);

  // Only show the portion of the path that belongs to the current floor
  const currentFloorPath = useMemo(() => {
    if (!fullPath || currentFloor === null) return [];
    const floorNum = Number(currentFloor);
    return fullPath.filter((n) => n.floor === floorNum);
  }, [fullPath, currentFloor]);

  const startRoom = useMemo(
    () => allRooms.find((r) => r.id === startRoomId) ?? null,
    [allRooms, startRoomId],
  );
  const endRoom = useMemo(
    () => allRooms.find((r) => r.id === endRoomId) ?? null,
    [allRooms, endRoomId],
  );

  const handleRoomSelect = useCallback(
    (room: IndoorNode) => {
      if (selectorTarget === 'start') setStartRoomId(room.id);
      else setEndRoomId(room.id);
      setSelectorTarget(null);
    },
    [selectorTarget],
  );

  const clearPath = useCallback(() => {
    setStartRoomId(null);
    setEndRoomId(null);
  }, []);

  // Floors where the path actually exists, in order
  const pathFloors = useMemo(() => {
    if (!fullPath) return [];
    const floors = [...new Set(fullPath.map((n) => String(n.floor)))];
    return floors.sort((a, b) => Number(a) - Number(b));
  }, [fullPath]);

  const handleNextPathFloor = useCallback(() => {
    if (!currentFloor || pathFloors.length === 0) return;
    const index = pathFloors.indexOf(currentFloor);
    if (index > 0) setCurrentFloor(pathFloors[index - 1]);
  }, [currentFloor, pathFloors]);

  const handlePrevPathFloor = useCallback(() => {
    if (!currentFloor || pathFloors.length === 0) return;
    const index = pathFloors.indexOf(currentFloor);
    if (index < pathFloors.length - 1) setCurrentFloor(pathFloors[index + 1]);
  }, [currentFloor, pathFloors]);

  // OPEN SHEET
  const openAvailableBuildings = () => {
    bottomSheetRef.current?.open();
    hideAppSearchBar();
    setIndoorSheetOpen(true);
  };

  // CLOSE SHEET
  const handleRevealSearchBar = () => {
    revealSearchBar();
    setIndoorSheetOpen(false);
  };

  // WHEN USER SELECTS BUILDING
  const handleSelectBuilding = (b: BuildingShape) => {
    setSelectedBuilding(b);
    bottomSheetRef.current?.close();
  };

  // FLOOR PLANS BASED ON SELECTED BUILDING
  const indoorFloorPlans = useMemo(() => {
    const code = selectedBuilding?.shortCode;
    if (!code || !(code in floorPlans)) return null;

    return floorPlans[code as keyof typeof floorPlans];
  }, [selectedBuilding?.shortCode]);

  const floorLevels = useMemo(() => {
    return indoorFloorPlans ? Object.keys(indoorFloorPlans) : [];
  }, [indoorFloorPlans]);

  // RESET FLOOR WHEN BUILDING CHANGES
  useEffect(() => {
    if (floorLevels.length > 0) {
      setCurrentFloor(floorLevels[0]);
    }

    setStartRoomId(null);
    setEndRoomId(null);
  }, [floorLevels]);

  useEffect(() => {
    setStartRoomId(null);
    setEndRoomId(null);
  }, [selectedBuilding]);

  useEffect(() => {
    if (!startRoomId || !endRoomId || !buildingGraph) return;
    const node = buildingGraph.nodes.find((n) => n.id === startRoomId);
    if (node) setCurrentFloor(String(node.floor));
  }, [startRoomId, endRoomId, buildingGraph]);

  useEffect(() => {
    if (externalStartRoomId !== undefined) setStartRoomId(externalStartRoomId ?? null);
  }, [externalStartRoomId]);

  useEffect(() => {
    if (externalEndRoomId !== undefined) setEndRoomId(externalEndRoomId ?? null);
  }, [externalEndRoomId]);

  const handleFloorUp = useCallback(() => {
    setCurrentFloor((prev) => {
      if (prev === null) return prev;

      const index = floorLevels.indexOf(prev);
      if (index === -1) return prev;

      return floorLevels[Math.min(index + 1, floorLevels.length - 1)];
    });
  }, [floorLevels]);

  const handleFloorDown = useCallback(() => {
    setCurrentFloor((prev) => {
      if (prev === null) return prev;

      const index = floorLevels.indexOf(prev);
      if (index === -1) return prev;

      return floorLevels[Math.max(index - 1, 0)];
    });
  }, [floorLevels]);

  const plan =
    indoorFloorPlans && currentFloor !== null
      ? indoorFloorPlans[currentFloor as unknown as keyof typeof indoorFloorPlans]
      : null;

  console.log('plan:', plan?.type, plan);

  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'white' }}>
      {/* CONTROLS */}
      <IndoorControls
        onExitIndoor={onExitIndoor}
        onOpenCalendar={onOpenCalendar}
        onFloorUp={handleFloorUp}
        onFloorDown={handleFloorDown}
        currentFloor={currentFloor}
        openAvailableBuildings={openAvailableBuildings}
        isIndoorSheetOpen={isIndoorSheetOpen}
        building={selectedBuilding}
        onPrevPathFloor={handlePrevPathFloor}
        onNextPathFloor={handleNextPathFloor}
        hasPath={!!fullPath && pathFloors.length > 1}
      />

      {/* PATH NAV */}
      {fullPath && pathFloors.length > 1 && (
        <View style={styles.pathNavBar}>
          <TouchableOpacity style={styles.pathNavBtn} onPress={handlePrevPathFloor}>
            <Text style={styles.pathNavText}>PREV</Text>
          </TouchableOpacity>
          <View style={styles.pathNavDivider} />
          <TouchableOpacity style={styles.pathNavBtn} onPress={handleNextPathFloor}>
            <Text style={styles.pathNavText}>NEXT</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* PATH NAV MSG */}
      {fullPath && fullPath.length > 0 && (
        <View style={styles.pathSteps}>
          {getPathSteps(fullPath).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* MAP */}
      <ReactNativeZoomableView
        maxZoom={10}
        minZoom={0.4}
        zoomStep={0.5}
        initialZoom={0.4}
        bindToBorders={true}
        contentWidth={2000}
        contentHeight={2000}
      >
        <View style={{ width: 2000, height: 2000, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 1000, height: 1000 }}>
            {plan?.type === 'svg' && <plan.data width={'100%'} height={'100%'} />}
            {plan?.type === 'png' && (
              <Image source={plan.data} style={{ width: 1000, height: 1000 }} resizeMode="contain" />
            )}
            <PathOverlay
              pathNodes={currentFloorPath}
              planType={plan?.type}
              allNodes={buildingGraph?.nodes ?? []}
              svgViewBox={SVG_VIEWBOXES[selectedBuilding?.shortCode ?? '']}
              nodeSpace={NODE_SPACES[selectedBuilding?.shortCode ?? '']}
            />
          </View>
        </View>
      </ReactNativeZoomableView>

      {/* BOTTOM SHEET */}
      <IndoorBottomSheet
        ref={bottomSheetRef}
        reOpenSearchBar={handleRevealSearchBar}
        onPressBuilding={handleSelectBuilding}
      />

      <RoomSelectorModal
        visible={selectorTarget !== null}
        rooms={allRooms}
        title={selectorTarget === 'start' ? 'Select start room' : 'Select destination'}
        onSelect={handleRoomSelect}
        onClose={() => setSelectorTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pathBar: {
    position: 'absolute',
    bottom: 160,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  pathBtn: {
    flex: 1,
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pathBtnActive: {
    backgroundColor: '#ddeeff',
    borderWidth: 1,
    borderColor: '#0057FF',
  },
  pathBtnText: { fontSize: 13, color: '#333' },
  clearBtn: {
    backgroundColor: '#ffdddd',
    borderRadius: 8,
    padding: 8,
  },
  clearBtnText: { color: '#FF4444', fontSize: 14, fontWeight: '600' },
  pathSteps: {
    position: 'absolute',
    bottom: 210,
    right: 16,
    zIndex: 100,
    elevation: 10,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 8,
    width: 175,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    gap: 4,
    opacity: 0.7,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepIcon: { fontSize: 11 },
  stepText: { fontSize: 11, color: '#333', flexShrink: 1 },
  pathNavBar: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    zIndex: 100,
    elevation: 10,
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  pathNavBtn: {
    flex: 1,
    backgroundColor: '#922338',
    paddingVertical: 10,
    alignItems: 'center',
  },
  pathNavDivider: {
    width: 1,
    backgroundColor: '#ffffff40',
  },
  pathNavText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
