import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import IndoorControls from '../src/components/indoor/IndoorControls';
import type { BuildingShape } from '../src/types/BuildingShape';
import { UIManager } from 'react-native';

const IndoorMapScreen = require('../src/screens/IndoorMapScreen').default;
const { findIndoorPath } = require('../src/utils/indoor/indoorPathFinding');

// ─── Top-level mock fns ───────────────────────────────────────────────────────

const mockSheetExpand = jest.fn();
const mockSheetClose = jest.fn();
const mockOnExitIndoor = jest.fn();
const mockOnOpenCalendar = jest.fn();
const mockHideAppSearchBar = jest.fn();
const mockRevealSearchBar = jest.fn();
const mockGetViewManagerConfig = jest.fn();
const originalHasViewManagerConfig = (
  UIManager as typeof UIManager & {
    hasViewManagerConfig?: (name: string) => boolean;
  }
).hasViewManagerConfig;

let capturedSheetProps: {
  reOpenSearchBar: () => void;
  onPressBuilding: (b: BuildingShape) => void;
} | null = null;
let capturedZoomableViewProps: Record<string, unknown> | null = null;

// ─── Dependency mocks ─────────────────────────────────────────────────────────

jest.mock('@openspacelabs/react-native-zoomable-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ReactNativeZoomableView: (props: { children: React.ReactNode }) => {
      capturedZoomableViewProps = props as unknown as Record<string, unknown>;
      return React.createElement(View, { testID: 'zoomable-view' }, props.children);
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));

jest.mock('../src/components/indoor/IndoorControls', () => jest.fn(() => null));

jest.mock('../src/components/indoor/BuildingListSheet', () => {
  const React = require('react');
  const MockSheet = React.forwardRef((props: any, ref: any) => {
    capturedSheetProps = props;
    React.useImperativeHandle(ref, () => ({
      open: mockSheetExpand,
      close: mockSheetClose,
    }));
    return null;
  });
  MockSheet.displayName = 'MockIndoorBottomSheet';
  return MockSheet;
});

jest.mock('../src/components/indoor/PathOverlay', () => jest.fn(() => null));

const mockedFloorPlans: Record<string, Record<string, { type: string; data: any }>> = {
  H: {
    1: { type: 'svg', data: jest.fn(() => null) },
    2: { type: 'svg', data: jest.fn(() => null) },
    8: { type: 'svg', data: jest.fn(() => null) },
    9: { type: 'svg', data: jest.fn(() => null) },
  },
  MB: {
    S2: { type: 'png', data: { uri: 'MB_S2.png' } },
    1: { type: 'png', data: { uri: 'MB_1.png' } },
  },
};

jest.mock('../src/utils/floorPlans', () => ({
  getFloorPlansForBuilding: (buildingCode: string) => mockedFloorPlans[buildingCode] ?? null,
  getFloorPlan: (buildingCode: string, floorLevel: string) =>
    mockedFloorPlans[buildingCode]?.[floorLevel] ?? null,
}));

const mockedIndoorGraphs: Record<
  string,
  { nodes: Array<{ id: string; floor: number }>; edges: any[] }
> = {
  CC: {
    nodes: [{ id: 'cc-101', floor: 1 }],
    edges: [],
  },
  H: {
    nodes: [
      { id: 'a', floor: 1 },
      { id: 'b', floor: 1 },
      { id: 'c', floor: 2 },
      { id: 'd', floor: 3 },
      { id: 'h-101', floor: 1 },
      { id: 'h-202', floor: 2 },
    ],
    edges: [],
  },
  MB: {
    nodes: [{ id: 'mb-101', floor: 1 }],
    edges: [],
  },
  VE: {
    nodes: [{ id: 've-101', floor: 1 }],
    edges: [],
  },
};

jest.mock('../src/utils/indoor/indoorGraphs', () => ({
  getIndoorGraph: (buildingCode: string) => mockedIndoorGraphs[buildingCode] ?? null,
}));

jest.mock('../src/utils/indoor/indoorPathFinding', () => ({
  getRoomNodes: jest.fn(() => []),
  findIndoorPath: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const buildingH = {
  id: 'sgw-h',
  shortCode: 'H',
  name: 'H Building',
  campus: 'SGW',
  polygons: [],
  images: [],
} as unknown as BuildingShape;

const buildingMB = {
  id: 'sgw-mb',
  shortCode: 'MB',
  name: 'MB Building',
  campus: 'SGW',
  polygons: [],
  images: [],
} as unknown as BuildingShape;

const buildingNoPlans = {
  id: 'sgw-ev',
  shortCode: 'EV',
  name: 'EV Building',
  campus: 'SGW',
  polygons: [],
  images: [],
} as unknown as BuildingShape;

// ─── Prop accessors ───────────────────────────────────────────────────────────

const getControlsProps = () => {
  const calls = jest.mocked(IndoorControls).mock.calls;
  return calls[calls.length - 1][0];
};

const getSheetProps = () => {
  if (!capturedSheetProps) throw new Error('IndoorBottomSheet has not rendered yet');
  return capturedSheetProps;
};

const getZoomableViewProps = () => {
  if (!capturedZoomableViewProps) {
    throw new Error('ReactNativeZoomableView has not rendered yet');
  }
  return capturedZoomableViewProps;
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('IndoorMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedSheetProps = null;
    capturedZoomableViewProps = null;
    delete mockedFloorPlans.XYZ;
    delete mockedIndoorGraphs.XYZ;
    mockedIndoorGraphs.H = {
      nodes: [
        { id: 'a', floor: 1 },
        { id: 'b', floor: 1 },
        { id: 'c', floor: 2 },
        { id: 'd', floor: 3 },
        { id: 'h-101', floor: 1 },
        { id: 'h-202', floor: 2 },
      ],
      edges: [],
    };
    mockedIndoorGraphs.MB = {
      nodes: [{ id: 'mb-101', floor: 1 }],
      edges: [],
    };
    mockGetViewManagerConfig.mockImplementation((name: string) =>
      name.startsWith('RNSVG') ? {} : null,
    );
    (
      UIManager as typeof UIManager & {
        hasViewManagerConfig?: (name: string) => boolean;
      }
    ).hasViewManagerConfig = originalHasViewManagerConfig;
    (
      UIManager as typeof UIManager & {
        getViewManagerConfig?: (name: string) => unknown;
      }
    ).getViewManagerConfig = mockGetViewManagerConfig;
    findIndoorPath.mockReturnValue(null);
  });

  test('renders correctly and passes initial props to IndoorControls', () => {
    const { getByTestId } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        onOpenCalendar={mockOnOpenCalendar}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    expect(getByTestId('zoomable-view')).toBeTruthy();
    expect(getControlsProps().building).toEqual(buildingH);
    expect(getControlsProps().currentFloor).toBe('1');
    expect(getControlsProps().isIndoorSheetOpen).toBe(false);
    expect(getControlsProps().onOpenCalendar).toBe(mockOnOpenCalendar);
  });

  test('currentFloor is null and onOpenCalendar is undefined when not provided', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingNoPlans}
      />,
    );

    expect(getControlsProps().currentFloor).toBeNull();
    expect(getControlsProps().onOpenCalendar).toBeUndefined();
  });

  test('onExitIndoor and onOpenCalendar callbacks fire correctly', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        onOpenCalendar={mockOnOpenCalendar}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    getControlsProps().onExitIndoor();
    getControlsProps().onOpenCalendar?.();

    expect(mockOnExitIndoor).toHaveBeenCalledTimes(1);
    expect(mockOnOpenCalendar).toHaveBeenCalledTimes(1);
  });

  test('auto exits only after a deliberate zoom-out gesture that ends near min zoom', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        onOpenCalendar={mockOnOpenCalendar}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    const onZoomAfter = getZoomableViewProps().onZoomAfter as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;
    const onZoomBefore = getZoomableViewProps().onZoomBefore as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;
    const onZoomEnd = getZoomableViewProps().onZoomEnd as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;

    expect(onZoomBefore).toBeDefined();
    expect(onZoomAfter).toBeDefined();
    expect(onZoomEnd).toBeDefined();

    act(() => {
      onZoomBefore?.(null, null, { zoomLevel: 0.4 });
      onZoomAfter?.(null, null, { zoomLevel: 0.8 });
      onZoomEnd?.(null, null, { zoomLevel: 0.8 });
    });
    expect(mockOnExitIndoor).toHaveBeenCalledTimes(0);

    act(() => {
      onZoomBefore?.(null, null, { zoomLevel: 0.9 });
      onZoomAfter?.(null, null, { zoomLevel: 0.4 });
      onZoomEnd?.(null, null, { zoomLevel: 0.4 });
    });
    expect(mockOnExitIndoor).toHaveBeenCalledTimes(1);

    act(() => {
      onZoomBefore?.(null, null, { zoomLevel: 0.8 });
      onZoomAfter?.(null, null, { zoomLevel: 0.4 });
      onZoomEnd?.(null, null, { zoomLevel: 0.4 });
    });
    expect(mockOnExitIndoor).toHaveBeenCalledTimes(1);
  });

  test('does not auto exit when zoom end payload is invalid', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    const onZoomEnd = getZoomableViewProps().onZoomEnd as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;

    expect(onZoomEnd).toBeDefined();

    act(() => {
      onZoomEnd?.(null, null, { zoomLevel: Number.NaN });
    });

    expect(mockOnExitIndoor).not.toHaveBeenCalled();
  });

  test('does not auto exit on small zoom-out gestures near minimum zoom', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    const onZoomBefore = getZoomableViewProps().onZoomBefore as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;
    const onZoomAfter = getZoomableViewProps().onZoomAfter as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;
    const onZoomEnd = getZoomableViewProps().onZoomEnd as
      | ((event: unknown, gestureState: unknown, zoomEvent: { zoomLevel: number }) => void)
      | undefined;

    act(() => {
      onZoomBefore?.(null, null, { zoomLevel: 0.45 });
      onZoomAfter?.(null, null, { zoomLevel: 0.41 });
      onZoomEnd?.(null, null, { zoomLevel: 0.41 });
    });

    expect(mockOnExitIndoor).not.toHaveBeenCalled();
  });

  test('openAvailableBuildings opens sheet, hides search bar and sets isIndoorSheetOpen', async () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    getControlsProps().openAvailableBuildings();

    expect(mockSheetExpand).toHaveBeenCalledTimes(1);
    expect(mockHideAppSearchBar).toHaveBeenCalledTimes(1);
    expect(mockRevealSearchBar).not.toHaveBeenCalled();
    await waitFor(() => expect(getControlsProps().isIndoorSheetOpen).toBe(true));
  });

  test('reOpenSearchBar reveals search bar, resets isIndoorSheetOpen, and does not call hideAppSearchBar again', async () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    getControlsProps().openAvailableBuildings();
    await waitFor(() => expect(getControlsProps().isIndoorSheetOpen).toBe(true));

    getSheetProps().reOpenSearchBar();

    expect(mockRevealSearchBar).toHaveBeenCalledTimes(1);
    expect(mockHideAppSearchBar).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getControlsProps().isIndoorSheetOpen).toBe(false));
  });

  test('onPressBuilding closes sheet, updates building, and resets currentFloor', async () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    getControlsProps().onFloorUp();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('2'));

    getSheetProps().onPressBuilding(buildingMB);

    expect(mockSheetClose).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(getControlsProps().building).toEqual(buildingMB);
      expect(getControlsProps().currentFloor).toBe('1');
    });
  });

  test('syncs the selected building when the incoming building prop changes', async () => {
    const { rerender } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    expect(getControlsProps().building).toEqual(buildingH);

    rerender(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
      />,
    );

    await waitFor(() => {
      expect(getControlsProps().building).toEqual(buildingMB);
      expect(getControlsProps().currentFloor).toBe('1');
    });
  });

  test('floor navigation increments, decrements, and clamps correctly', async () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    getControlsProps().onFloorUp();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('2'));

    getControlsProps().onFloorDown();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));

    for (let i = 0; i < 10; i++) getControlsProps().onFloorDown();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));

    // H has floors 1, 2, 8, 9
    for (let i = 0; i < 10; i++) getControlsProps().onFloorUp();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('9'));
  });

  test('floor navigation does not throw and currentFloor stays null when building has no plans', () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingNoPlans}
      />,
    );

    expect(() => {
      getControlsProps().onFloorUp();
      getControlsProps().onFloorDown();
    }).not.toThrow();

    expect(getControlsProps().currentFloor).toBeNull();
  });

  test('externalStartRoomId and externalEndRoomId are applied when provided', async () => {
    const mockPathStepsChange = jest.fn();
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="h-101"
        externalEndRoomId="h-202"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => expect(mockPathStepsChange).toHaveBeenCalled());
  });

  test('reapplies external route ids after switching to the matching building graph', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockImplementation(
      (nodes: any[], _edges: any[], startId: string, endId: string) => {
        const nodeIds = nodes.map((node) => node.id);
        if (
          nodeIds.includes('hall-start') &&
          nodeIds.includes('hall-exit') &&
          startId === 'hall-start' &&
          endId === 'hall-exit'
        ) {
          return [
            {
              id: 'hall-start',
              type: 'room',
              floor: 1,
              label: 'H-110',
              buildingId: 'H',
              x: 0,
              y: 0,
              accessible: true,
            },
            {
              id: 'hall-exit',
              type: 'building_entry_exit',
              floor: 1,
              label: '',
              buildingId: 'H',
              x: 0,
              y: 0,
              accessible: true,
            },
          ];
        }

        return null;
      },
    );

    mockedIndoorGraphs.MB = {
      nodes: [{ id: 'mb-101', floor: 1 }],
      edges: [],
    };
    mockedIndoorGraphs.H = {
      nodes: [
        { id: 'hall-start', floor: 1 },
        { id: 'hall-exit', floor: 1 },
      ],
      edges: [],
    };

    const { rerender } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
        externalStartRoomId="hall-start"
        externalEndRoomId="hall-exit"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    rerender(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="hall-start"
        externalEndRoomId="hall-exit"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      expect(findIndoorPath).toHaveBeenCalledWith(
        mockedIndoorGraphs.H.nodes,
        mockedIndoorGraphs.H.edges,
        'hall-start',
        'hall-exit',
        {
          accessibleOnly: false,
          preferElevators: false,
        },
      );
    });

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((step: any) => step.label === 'Start: H-110 (Floor 1)')).toBe(true);
      expect(steps.some((step: any) => step.label === 'End: H Exit (Floor 1)')).toBe(true);
    });
  });

  test('maps graph floor 2 back to the S2 floor key for MB routes', async () => {
    mockedIndoorGraphs.MB = {
      nodes: [
        { id: 'mb-s2-start', floor: 2 },
        { id: 'mb-s2-end', floor: 2 },
      ],
      edges: [],
    };

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
        externalStartRoomId="mb-s2-start"
        externalEndRoomId="mb-s2-end"
      />,
    );

    await waitFor(() => expect(getControlsProps().currentFloor).toBe('S2'));
  });

  test('treats MB S2 as a basement floor in building floor navigation', async () => {
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
      />,
    );

    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));

    getControlsProps().onFloorDown();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('S2'));

    getControlsProps().onFloorUp();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));
  });

  test('uses the UI floor key in MB path step labels', async () => {
    const mockPathStepsChange = jest.fn();
    mockedIndoorGraphs.MB = {
      nodes: [
        { id: 'mb-1-start', floor: 1 },
        { id: 'mb-elevator', floor: 1 },
        { id: 'mb-s2-end', floor: 2 },
      ],
      edges: [],
    };

    findIndoorPath.mockReturnValue([
      {
        id: 'mb-1-start',
        type: 'room',
        floor: 1,
        label: 'MB-1.132',
        buildingId: 'MB',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'mb-elevator',
        type: 'elevator_door',
        floor: 1,
        label: '',
        buildingId: 'MB',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'mb-s2-end',
        type: 'room',
        floor: 2,
        label: 'MB-S2.210',
        buildingId: 'MB',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
        externalStartRoomId="mb-1-start"
        externalEndRoomId="mb-s2-end"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label === 'End: MB-S2.210 (Floor S2)')).toBe(true);
      expect(steps.some((s: any) => s.label === 'Elevator to floor S2')).toBe(true);
    });
  });

  test('onPathStepsChange fires with empty array when no valid path exists', async () => {
    const mockPathStepsChange = jest.fn();
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => expect(mockPathStepsChange).toHaveBeenCalledWith([]));
  });

  test('onFloorNavReady is called with prev and next floor handlers', async () => {
    const mockFloorNavReady = jest.fn();
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        onFloorNavReady={mockFloorNavReady}
      />,
    );

    await waitFor(() => {
      expect(mockFloorNavReady).toHaveBeenCalledWith(expect.any(Function), expect.any(Function));
    });
  });

  test('renders a PNG plan for a building with png floor plans', () => {
    const { UNSAFE_getByType } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingMB}
      />,
    );
    const { Image } = require('react-native');
    expect(UNSAFE_getByType(Image)).toBeTruthy();
  });

  test('shows a fallback message instead of rendering the SVG plan when native SVG support is missing', () => {
    mockGetViewManagerConfig.mockReturnValue(null);

    const { getByTestId, getByText } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    expect(getByTestId('indoor-map-svg-fallback')).toBeTruthy();
    expect(getByText('Indoor map unavailable in this build')).toBeTruthy();
  });

  test('uses UIManager.hasViewManagerConfig when available to detect native SVG support', () => {
    const mockHasViewManagerConfig = jest.fn((name: string) => name === 'RNSVGPath');
    (
      UIManager as typeof UIManager & {
        hasViewManagerConfig?: (name: string) => boolean;
      }
    ).hasViewManagerConfig = mockHasViewManagerConfig;

    const { queryByTestId } = render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
      />,
    );

    expect(mockHasViewManagerConfig).toHaveBeenCalled();
    expect(queryByTestId('indoor-map-svg-fallback')).toBeNull();
  });

  test('handleNextPathFloor and handlePrevPathFloor are passed as functions via onFloorNavReady', async () => {
    const mockFloorNavReady = jest.fn();
    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        onFloorNavReady={mockFloorNavReady}
      />,
    );

    await waitFor(() => {
      const [prevFn, nextFn] = mockFloorNavReady.mock.calls[0];
      expect(() => prevFn()).not.toThrow();
      expect(() => nextFn()).not.toThrow();
    });
  });

  test('onPathStepsChange includes start and end labels when path is found', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'Room A',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'room',
        floor: 1,
        label: 'Room B',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="a"
        externalEndRoomId="b"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label?.includes('Start'))).toBe(true);
      expect(steps.some((s: any) => s.label?.includes('End'))).toBe(true);
    });
  });

  test('onPathStepsChange humanizes a transfer-point destination into a building exit label', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'CC-101',
        buildingId: 'CC',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'building_entry_exit',
        floor: 1,
        label: '',
        buildingId: 'CC',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={{ ...buildingH, shortCode: 'CC', name: 'CC Building' }}
        externalStartRoomId="a"
        externalEndRoomId="b"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label === 'End: CC Exit (Floor 1)')).toBe(true);
    });
  });

  test('onPathStepsChange humanizes a transfer-point start into a building entrance label', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'building_entry_exit',
        floor: 1,
        label: '',
        buildingId: 'VE',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'room',
        floor: 1,
        label: 'VE-101',
        buildingId: 'VE',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={{ ...buildingH, shortCode: 'VE', name: 'VE Building', campus: 'LOYOLA' }}
        externalStartRoomId="a"
        externalEndRoomId="b"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label === 'Start: VE Entrance (Floor 1)')).toBe(true);
    });
  });

  test('onPathStepsChange includes elevator label when path crosses floors via elevator', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'Room A',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'elevator_door',
        floor: 1,
        label: '',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'c',
        type: 'room',
        floor: 2,
        label: 'Room C',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="a"
        externalEndRoomId="c"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label?.toLowerCase().includes('elevator'))).toBe(true);
    });
  });

  test('onPathStepsChange includes stair label when path crosses floors via stair_landing', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'Room A',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'stair_landing',
        floor: 1,
        label: '',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'c',
        type: 'room',
        floor: 2,
        label: 'Room C',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="a"
        externalEndRoomId="c"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label?.toLowerCase().includes('stair'))).toBe(true);
    });
  });

  test('onPathStepsChange humanizes unlabeled non-transfer nodes', async () => {
    const mockPathStepsChange = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'Room A',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'elevator_door',
        floor: 1,
        label: '',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="a"
        externalEndRoomId="b"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label === 'End: elevator door (Floor 1)')).toBe(true);
    });
  });

  test('onPathStepsChange falls back to the raw selected building short code for transfer labels', async () => {
    const mockPathStepsChange = jest.fn();
    mockedFloorPlans.XYZ = {
      1: { type: 'svg', data: jest.fn(() => null) },
    };
    mockedIndoorGraphs.XYZ = {
      nodes: [{ id: 'start', floor: 1 }],
      edges: [],
    };

    findIndoorPath.mockReturnValue([
      {
        id: 'start',
        type: 'room',
        floor: 1,
        label: 'Start',
        buildingId: 'XYZ',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'exit',
        type: 'building_entry_exit',
        floor: 1,
        label: '',
        buildingId: undefined,
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={{
          id: 'mystery-annex',
          shortCode: 'XYZ',
          name: 'Mystery Annex',
          campus: 'SGW',
          polygons: [],
        }}
        externalStartRoomId="start"
        externalEndRoomId="exit"
        onPathStepsChange={mockPathStepsChange}
      />,
    );

    await waitFor(() => {
      const steps = mockPathStepsChange.mock.calls.flat(2);
      expect(steps.some((s: any) => s.label === 'End: XYZ Exit (Floor 1)')).toBe(true);
    });
  });

  test('path floor navigation handlers move between route floors and clamp at the ends', async () => {
    const mockFloorNavReady = jest.fn();
    findIndoorPath.mockReturnValue([
      {
        id: 'a',
        type: 'room',
        floor: 1,
        label: 'Room A',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'b',
        type: 'stair_landing',
        floor: 1,
        label: '',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'c',
        type: 'room',
        floor: 2,
        label: 'Room C',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'd',
        type: 'stair_landing',
        floor: 2,
        label: '',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
      {
        id: 'e',
        type: 'room',
        floor: 3,
        label: 'Room E',
        buildingId: 'H',
        x: 0,
        y: 0,
        accessible: true,
      },
    ]);

    render(
      <IndoorMapScreen
        onExitIndoor={mockOnExitIndoor}
        hideAppSearchBar={mockHideAppSearchBar}
        revealSearchBar={mockRevealSearchBar}
        building={buildingH}
        externalStartRoomId="a"
        externalEndRoomId="e"
        onFloorNavReady={mockFloorNavReady}
      />,
    );

    let prevPathFloor: () => void;
    let nextPathFloor: () => void;

    await waitFor(() => {
      expect(mockFloorNavReady).toHaveBeenCalled();
      [prevPathFloor, nextPathFloor] = mockFloorNavReady.mock.calls.at(-1);
      expect(getControlsProps().currentFloor).toBe('1');
    });

    nextPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('2'));
    [, nextPathFloor] = mockFloorNavReady.mock.calls.at(-1);

    nextPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('3'));
    [prevPathFloor, nextPathFloor] = mockFloorNavReady.mock.calls.at(-1);

    nextPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('3'));
    [prevPathFloor, nextPathFloor] = mockFloorNavReady.mock.calls.at(-1);

    prevPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('2'));
    [prevPathFloor] = mockFloorNavReady.mock.calls.at(-1);

    prevPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));
    [prevPathFloor] = mockFloorNavReady.mock.calls.at(-1);

    prevPathFloor!();
    await waitFor(() => expect(getControlsProps().currentFloor).toBe('1'));
  });
});
