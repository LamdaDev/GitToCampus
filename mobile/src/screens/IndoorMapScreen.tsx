import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, Image, Text, UIManager } from 'react-native';
import IndoorControls from '../components/indoor/IndoorControls';
import { BuildingShape } from '../types/BuildingShape';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { floorPlans } from '../utils/floorPlans';
import IndoorBottomSheet, { IndoorBottomSheetRef } from '../components/indoor/BuildingListSheet';
import PathOverlay from '../components/indoor/PathOverlay';
import { findIndoorPath, type IndoorNode } from '../utils/indoor/indoorPathFinding';
import { getIndoorGraph } from '../utils/indoor/indoorGraphs';
import styles from '../styles/IndoorMapScreen.styles';

type props = {
  onExitIndoor: () => void;
  onOpenCalendar?: () => void;
  hideAppSearchBar: () => void;
  revealSearchBar: () => void;
  building: BuildingShape;
  externalStartRoomId?: string | null;
  externalEndRoomId?: string | null;
  onPathStepsChange?: (steps: { icon: string; label: string }[]) => void;
  onFloorNavReady?: (prev: () => void, next: () => void) => void;
  onIndoorRouteChange?: (startId: string | null, endId: string | null) => void;
  indoorTravelMode?: 'walking' | 'disability';
};

const SVG_VIEW_MANAGER_NAMES = ['RNSVGSvgViewAndroid', 'RNSVGSvgView', 'RNSVGPath'];

const hasNativeSvgSupport = () => {
  const nativeUIManager = UIManager as typeof UIManager & {
    hasViewManagerConfig?: (name: string) => boolean;
    getViewManagerConfig?: (name: string) => unknown;
  };

  if (typeof nativeUIManager.hasViewManagerConfig === 'function') {
    return SVG_VIEW_MANAGER_NAMES.some((name) => nativeUIManager.hasViewManagerConfig?.(name));
  }

  if (typeof nativeUIManager.getViewManagerConfig === 'function') {
    return SVG_VIEW_MANAGER_NAMES.some(
      (name) => nativeUIManager.getViewManagerConfig?.(name) != null,
    );
  }

  return true;
};

// ── Building graph data keyed by short code ──────────────────────────────────
// ── SVG coordinates for scaling path overlay ───────────────────────────
const NODE_SPACES: Record<string, { width: number; height: number }> = {
  H: { width: 2040, height: 2040 },
  CC: { width: 4096, height: 1024 },
  VE: { width: 1623, height: 622 },
  MB: { width: 949, height: 977 },
  VL: { width: 831, height: 940 },
};

const SVG_VIEWBOXES: Record<string, { width: number; height: number }> = {
  H: { width: 1024, height: 1024 },
  CC: { width: 4096, height: 1024 },
  VE: { width: 1024, height: 1024 },
  MB: { width: 1000, height: 1000 },
  VL: { width: 1000, height: 1000 },
};

// ── Converts path steps into labelled navigation steps ───────────────────────────
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
  const end = path.at(-1);
  steps.unshift({
    icon: '🟢',
    label: `Start: ${start.label || start.type} (Floor ${start.floor})`,
  });
  steps.push({ icon: '🔴', label: `End: ${end?.label || end?.type} (Floor ${end?.floor})` });

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
  onPathStepsChange,
  onFloorNavReady,
  indoorTravelMode = 'walking',
}: Readonly<props>) {
  const bottomSheetRef = useRef<IndoorBottomSheetRef>(null);

  const [isIndoorSheetOpen, setIndoorSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(building);
  const [currentFloor, setCurrentFloor] = useState<string | null>(null);

  // ── Path state ──────────────────────────────────────────────────────────────
  const [startRoomId, setStartRoomId] = useState<string | null>(null);
  const [endRoomId, setEndRoomId] = useState<string | null>(null);

  // ── Path Logic ──────────────────────────────────────────────────────────────
  const buildingGraph = useMemo(() => {
    return getIndoorGraph(selectedBuilding?.shortCode);
  }, [selectedBuilding?.shortCode]);

  const fullPath = useMemo(() => {
    if (!startRoomId || !endRoomId || !buildingGraph) return null;

    return findIndoorPath(buildingGraph.nodes, buildingGraph.edges, startRoomId, endRoomId, {
      accessibleOnly: indoorTravelMode === 'disability',
      preferElevators: indoorTravelMode === 'disability',
    });
  }, [startRoomId, endRoomId, buildingGraph, indoorTravelMode]);

  const currentFloorPath = useMemo(() => {
    if (!fullPath || currentFloor === null) return [];
    const floorNum = Number(currentFloor);
    return fullPath.filter((n) => n.floor === floorNum);
  }, [fullPath, currentFloor]);

  const pathFloors = useMemo(() => {
    if (!fullPath) return [];
    const seen = new Set<string>();
    const floors: string[] = [];
    for (const node of fullPath) {
      const f = String(node.floor);
      if (!seen.has(f)) {
        seen.add(f);
        floors.push(f);
      }
    }
    return floors;
  }, [fullPath]);

  // ── Path Prev/Next Floor ──────────────────────────────────────────────────────────────
  const handleNextPathFloor = useCallback(() => {
    if (!currentFloor || pathFloors.length === 0) return;
    const index = pathFloors.indexOf(currentFloor);
    if (index < pathFloors.length - 1) setCurrentFloor(pathFloors[index + 1]);
  }, [currentFloor, pathFloors]);

  const handlePrevPathFloor = useCallback(() => {
    if (!currentFloor || pathFloors.length === 0) return;
    const index = pathFloors.indexOf(currentFloor);
    if (index > 0) setCurrentFloor(pathFloors[index - 1]);
  }, [currentFloor, pathFloors]);

  // OPEN BUILDING LIST SHEET
  const openAvailableBuildings = () => {
    bottomSheetRef.current?.open();
    hideAppSearchBar();
    setIndoorSheetOpen(true);
  };

  // CLOSE BUILDING LIST SHEET
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

  useEffect(() => {
    setSelectedBuilding(building);
  }, [building]);

  // RESET FLOOR WHEN BUILDING CHANGES
  useEffect(() => {
    if (floorLevels.length > 0) {
      setCurrentFloor(floorLevels[0]);
    }

    setStartRoomId(null);
    setEndRoomId(null);
  }, [floorLevels]);

  // SAME AS ABOVE
  useEffect(() => {
    setStartRoomId(null);
    setEndRoomId(null);
  }, [selectedBuilding]);

  // ── Jump to start room's floor when a route is set ───────────────────────────
  useEffect(() => {
    if (!startRoomId || !endRoomId || !buildingGraph) return;
    const node = buildingGraph.nodes.find((n) => n.id === startRoomId);
    if (node) setCurrentFloor(String(node.floor));
  }, [startRoomId, endRoomId, buildingGraph]);

  // ── Sync externalroomId from BottomSlider ─────────────────────────────────
  useEffect(() => {
    if (externalStartRoomId !== undefined) setStartRoomId(externalStartRoomId ?? null);
  }, [externalStartRoomId]);

  useEffect(() => {
    if (externalEndRoomId !== undefined) setEndRoomId(externalEndRoomId ?? null);
  }, [externalEndRoomId]);

  useEffect(() => {
    if (fullPath && fullPath.length > 0) {
      onPathStepsChange?.(getPathSteps(fullPath));
    } else {
      onPathStepsChange?.([]);
    }
  }, [fullPath]);

  // ── Pass floor nav handlers up to parent ─────────────────────────────────────
  useEffect(() => {
    onFloorNavReady?.(handlePrevPathFloor, handleNextPathFloor);
  }, [handlePrevPathFloor, handleNextPathFloor]);

  // ── BUILDING FLOOR NAV ────────────────────────────
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

  const nativeSvgSupported = useMemo(() => hasNativeSvgSupport(), []);
  const shouldShowSvgFallback =
    !nativeSvgSupported && (plan?.type === 'svg' || currentFloorPath.length >= 2);

  return (
    <View style={styles.container}>
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
      />

      {/* MAP */}
      <ReactNativeZoomableView
        maxZoom={10}
        minZoom={0.4}
        zoomStep={0.5}
        initialZoom={0.4}
        bindToBorders={true}
        contentWidth={2000}
        contentHeight={3000}
      >
        <View style={{ width: 2000, height: 3000, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 1000, height: 1000 }}>
            {plan?.type === 'svg' && nativeSvgSupported && (
              <plan.data width={'100%'} height={'100%'} />
            )}
            {plan?.type === 'png' && (
              <Image
                source={plan.data}
                style={{ width: 1000, height: 1000 }}
                resizeMode="contain"
              />
            )}
            {nativeSvgSupported && (
              <PathOverlay
                pathNodes={currentFloorPath}
                planType={plan?.type}
                svgViewBox={SVG_VIEWBOXES[selectedBuilding?.shortCode ?? '']}
                nodeSpace={NODE_SPACES[selectedBuilding?.shortCode ?? '']}
              />
            )}
            {shouldShowSvgFallback && (
              <View style={styles.mapUnavailableNotice} testID="indoor-map-svg-fallback">
                <Text style={styles.mapUnavailableTitle}>Indoor map unavailable in this build</Text>
                <Text style={styles.mapUnavailableText}>
                  Rebuild the app so the native SVG module is included, then reload this screen.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ReactNativeZoomableView>

      {/* BOTTOM SHEET */}
      <IndoorBottomSheet
        ref={bottomSheetRef}
        reOpenSearchBar={handleRevealSearchBar}
        onPressBuilding={handleSelectBuilding}
      />
    </View>
  );
}
