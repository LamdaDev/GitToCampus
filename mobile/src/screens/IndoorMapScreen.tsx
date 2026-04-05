import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { View, Image, Text, UIManager } from 'react-native';
import IndoorControls from '../components/indoor/IndoorControls';
import { BuildingShape } from '../types/BuildingShape';
import { ReactNativeZoomableView } from '@openspacelabs/react-native-zoomable-view';
import { getFloorPlan, getFloorPlansForBuilding } from '../utils/floorPlans';
import IndoorBottomSheet, { IndoorBottomSheetRef } from '../components/indoor/BuildingListSheet';
import PathOverlay from '../components/indoor/PathOverlay';
import { findIndoorPath, type IndoorNode } from '../utils/indoor/indoorPathFinding';
import { getIndoorGraph } from '../utils/indoor/indoorGraphs';
import { normalizeIndoorBuildingKey } from '../utils/indoor/buildingKeys';
import styles from '../styles/IndoorMapScreen.styles';

const INDOOR_MIN_ZOOM_LEVEL = 0.4;
const INDOOR_INITIAL_ZOOM_LEVEL = 0.4;
const INDOOR_AUTO_EXIT_MIN_ZOOM_BUFFER = 0.015;
const INDOOR_AUTO_EXIT_REQUIRED_DELTA = 0.08;

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

const parseFloorKeyToGraphFloor = (floorKey: string | null) => {
  if (!floorKey) return null;

  const numericFloor = Number(floorKey);
  if (!Number.isNaN(numericFloor)) return numericFloor;

  const normalizedFloorKey = floorKey.trim().toUpperCase();
  if (normalizedFloorKey.startsWith('S')) {
    const subLevel = Number(normalizedFloorKey.slice(1));
    return Number.isNaN(subLevel) ? null : subLevel;
  }

  return null;
};

const getFloorKeySortValue = (floorKey: string) => {
  const normalizedFloorKey = floorKey.trim().toUpperCase();

  if (normalizedFloorKey.startsWith('S')) {
    const subLevel = Number(normalizedFloorKey.slice(1));
    return Number.isNaN(subLevel) ? Number.POSITIVE_INFINITY : -subLevel;
  }

  const numericFloor = Number(normalizedFloorKey);
  if (!Number.isNaN(numericFloor)) return numericFloor;

  return Number.POSITIVE_INFINITY;
};

const buildFloorKeyByGraphFloorMap = (floorKeys: readonly string[]) => {
  const entries = floorKeys.flatMap((floorKey) => {
    const graphFloor = parseFloorKeyToGraphFloor(floorKey);
    return graphFloor === null ? [] : [[graphFloor, floorKey] as const];
  });

  return new Map<number, string>(entries);
};

// ── Building graph data keyed by short code ──────────────────────────────────
// ── SVG coordinates for scaling path overlay ───────────────────────────
const NODE_SPACES: Record<string, { width: number; height: number }> = {
  H: { width: 1024, height: 1024 },
  CC: { width: 4096, height: 1024 },
  VE: { width: 1024, height: 1024 },
  MB: { width: 1024, height: 1024 },
  VL: { width: 1024, height: 1024 },
};

const SVG_VIEWBOXES: Record<string, { width: number; height: number }> = {
  H: { width: 1024, height: 1024 },
  CC: { width: 4096, height: 1024 },
  VE: { width: 1024, height: 1024 },
  MB: { width: 1000, height: 1000 },
  VL: { width: 1000, height: 1000 },
};

// ── Converts path steps into labelled navigation steps ───────────────────────────
const humanizeIndoorNodeType = (type: string) => type.replaceAll('_', ' ');

const getIndoorNodeBuildingLabel = (
  node: IndoorNode | undefined,
  building: BuildingShape | null,
) => {
  const normalizedNodeBuildingKey = normalizeIndoorBuildingKey(node?.buildingId);
  if (normalizedNodeBuildingKey) return normalizedNodeBuildingKey;

  const normalizedSelectedBuildingKey =
    normalizeIndoorBuildingKey(building?.shortCode) ?? normalizeIndoorBuildingKey(building?.name);
  if (normalizedSelectedBuildingKey) return normalizedSelectedBuildingKey;

  return building?.shortCode ?? building?.name ?? 'Building';
};

const getPathEndpointLabel = ({
  node,
  role,
  building,
}: {
  node: IndoorNode | undefined;
  role: 'start' | 'end';
  building: BuildingShape | null;
}) => {
  if (!node) return role === 'start' ? 'Start' : 'End';

  const trimmedLabel = node.label?.trim();
  if (trimmedLabel) return trimmedLabel;

  if (node.type === 'building_entry_exit') {
    const buildingLabel = getIndoorNodeBuildingLabel(node, building);
    return `${buildingLabel} ${role === 'start' ? 'Entrance' : 'Exit'}`;
  }

  return humanizeIndoorNodeType(node.type);
};

const getPathFloorLabel = (
  floor: number | undefined,
  floorKeyByGraphFloor?: ReadonlyMap<number, string>,
) => {
  if (floor === undefined) return '?';
  return floorKeyByGraphFloor?.get(floor) ?? String(floor);
};

const getPathSteps = (
  path: IndoorNode[],
  building: BuildingShape | null,
  floorKeyByGraphFloor?: ReadonlyMap<number, string>,
) => {
  const steps: { icon: string; label: string }[] = [];
  let prevFloor = path[0]?.floor;

  for (let i = 1; i < path.length; i++) {
    const node = path[i];
    const prev = path[i - 1];

    if (node.type === 'elevator_door' || prev.type === 'elevator_door') {
      if (node.floor !== prevFloor) {
        steps.push({
          icon: '🛗',
          label: `Elevator to floor ${getPathFloorLabel(node.floor, floorKeyByGraphFloor)}`,
        });
        prevFloor = node.floor;
      }
    } else if (node.type === 'stair_landing' || prev.type === 'stair_landing') {
      if (node.floor !== prevFloor) {
        steps.push({
          icon: '🪜',
          label: `Stairs to floor ${getPathFloorLabel(node.floor, floorKeyByGraphFloor)}`,
        });
        prevFloor = node.floor;
      }
    }
  }

  const start = path[0];
  const end = path.at(-1);
  steps.unshift({
    icon: '🟢',
    label: `Start: ${getPathEndpointLabel({ node: start, role: 'start', building })} (Floor ${getPathFloorLabel(start?.floor, floorKeyByGraphFloor)})`,
  });
  steps.push({
    icon: '🔴',
    label: `End: ${getPathEndpointLabel({ node: end, role: 'end', building })} (Floor ${getPathFloorLabel(end?.floor, floorKeyByGraphFloor)})`,
  });

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
  const lastZoomLevelRef = useRef(INDOOR_INITIAL_ZOOM_LEVEL);
  const zoomGestureStartLevelRef = useRef<number | null>(null);
  const isZoomGestureActiveRef = useRef(false);
  const didAutoExitOnZoomOutRef = useRef(false);

  const [isIndoorSheetOpen, setIndoorSheetOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState(building);
  const [currentFloor, setCurrentFloor] = useState<string | null>(null);

  // ── Path state ──────────────────────────────────────────────────────────────
  const [startRoomId, setStartRoomId] = useState<string | null>(null);
  const [endRoomId, setEndRoomId] = useState<string | null>(null);

  // FLOOR PLANS BASED ON SELECTED BUILDING
  const buildingFloorPlans = useMemo(
    () => getFloorPlansForBuilding(selectedBuilding?.shortCode),
    [selectedBuilding?.shortCode],
  );

  const floorLevels = useMemo(() => {
    if (!buildingFloorPlans) return [];

    return [...Object.keys(buildingFloorPlans)].sort((floorA, floorB) => {
      const floorDifference = getFloorKeySortValue(floorA) - getFloorKeySortValue(floorB);
      if (floorDifference !== 0) return floorDifference;
      return floorA.localeCompare(floorB);
    });
  }, [buildingFloorPlans]);

  const floorKeyByGraphFloor = useMemo(
    () => buildFloorKeyByGraphFloorMap(floorLevels),
    [floorLevels],
  );

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
    const floorNum = parseFloorKeyToGraphFloor(currentFloor);
    if (floorNum === null) return [];
    return fullPath.filter((n) => n.floor === floorNum);
  }, [fullPath, currentFloor]);

  const pathFloors = useMemo(() => {
    if (!fullPath) return [];
    const seen = new Set<string>();
    const floors: string[] = [];
    for (const node of fullPath) {
      const f = floorKeyByGraphFloor.get(node.floor) ?? String(node.floor);
      if (!seen.has(f)) {
        seen.add(f);
        floors.push(f);
      }
    }
    return floors;
  }, [floorKeyByGraphFloor, fullPath]);

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

  useEffect(() => {
    setSelectedBuilding(building);
  }, [building]);

  // RESET FLOOR WHEN BUILDING CHANGES
  useEffect(() => {
    if (floorLevels.length > 0) {
      const defaultFloor =
        floorLevels.find((floorKey) => getFloorKeySortValue(floorKey) >= 0) ?? floorLevels[0];
      setCurrentFloor(defaultFloor);
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
    if (node) {
      setCurrentFloor(floorKeyByGraphFloor.get(node.floor) ?? String(node.floor));
    }
  }, [buildingGraph, endRoomId, floorKeyByGraphFloor, startRoomId]);

  // ── Sync externalroomId from BottomSlider ─────────────────────────────────
  useEffect(() => {
    if (externalStartRoomId !== undefined) setStartRoomId(externalStartRoomId ?? null);
    if (externalEndRoomId !== undefined) setEndRoomId(externalEndRoomId ?? null);
  }, [externalEndRoomId, externalStartRoomId, selectedBuilding?.shortCode]);

  useEffect(() => {
    if (fullPath && fullPath.length > 0) {
      onPathStepsChange?.(getPathSteps(fullPath, selectedBuilding, floorKeyByGraphFloor));
    } else {
      onPathStepsChange?.([]);
    }
  }, [floorKeyByGraphFloor, fullPath, onPathStepsChange, selectedBuilding]);

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

  const plan = getFloorPlan(selectedBuilding?.shortCode, currentFloor);

  const nativeSvgSupported = useMemo(() => hasNativeSvgSupport(), []);
  const shouldShowSvgFallback =
    !nativeSvgSupported && (plan?.type === 'svg' || currentFloorPath.length >= 2);

  const handleZoomBefore = useCallback(
    (
      _event: unknown,
      _gestureState: unknown,
      zoomableViewEventObject: { zoomLevel: number } | null | undefined,
    ): boolean | undefined => {
      const nextZoomLevel = zoomableViewEventObject?.zoomLevel;
      if (typeof nextZoomLevel !== 'number' || !Number.isFinite(nextZoomLevel)) return undefined;

      if (!isZoomGestureActiveRef.current) {
        isZoomGestureActiveRef.current = true;
        zoomGestureStartLevelRef.current = nextZoomLevel;
      }

      return undefined;
    },
    [],
  );

  const handleZoomAfter = useCallback(
    (
      _event: unknown,
      _gestureState: unknown,
      zoomableViewEventObject: { zoomLevel: number } | null | undefined,
    ) => {
      const nextZoomLevel = zoomableViewEventObject?.zoomLevel;
      if (typeof nextZoomLevel !== 'number' || !Number.isFinite(nextZoomLevel)) return;
      lastZoomLevelRef.current = nextZoomLevel;
    },
    [],
  );

  const handleZoomEnd = useCallback(
    (
      _event: unknown,
      _gestureState: unknown,
      zoomableViewEventObject: { zoomLevel: number } | null | undefined,
    ) => {
      const finalZoomLevel = zoomableViewEventObject?.zoomLevel;
      if (typeof finalZoomLevel !== 'number' || !Number.isFinite(finalZoomLevel)) {
        isZoomGestureActiveRef.current = false;
        zoomGestureStartLevelRef.current = null;
        return;
      }

      const gestureStartZoomLevel = zoomGestureStartLevelRef.current ?? finalZoomLevel;
      isZoomGestureActiveRef.current = false;
      zoomGestureStartLevelRef.current = null;

      if (didAutoExitOnZoomOutRef.current) return;

      const isAtMinimumZoom =
        finalZoomLevel <= INDOOR_MIN_ZOOM_LEVEL + INDOOR_AUTO_EXIT_MIN_ZOOM_BUFFER;
      const didZoomOutEnough = finalZoomLevel <= gestureStartZoomLevel - INDOOR_AUTO_EXIT_REQUIRED_DELTA;

      if (!isAtMinimumZoom || !didZoomOutEnough) return;
      didAutoExitOnZoomOutRef.current = true;
      onExitIndoor();
    },
    [onExitIndoor],
  );

  useEffect(() => {
    lastZoomLevelRef.current = INDOOR_INITIAL_ZOOM_LEVEL;
    zoomGestureStartLevelRef.current = null;
    isZoomGestureActiveRef.current = false;
    didAutoExitOnZoomOutRef.current = false;
  }, [selectedBuilding?.id]);

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
        minZoom={INDOOR_MIN_ZOOM_LEVEL}
        zoomStep={0.5}
        initialZoom={INDOOR_INITIAL_ZOOM_LEVEL}
        bindToBorders={true}
        contentWidth={2000}
        contentHeight={3000}
        onZoomBefore={handleZoomBefore}
        onZoomAfter={handleZoomAfter}
        onZoomEnd={handleZoomEnd}
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
