import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import IndoorControls from '../src/components/indoor/IndoorControls';
import type { BuildingShape } from '../src/types/BuildingShape';

const IndoorMapScreen = require('../src/screens/IndoorMapScreen').default;

// ─── Top-level mock fns ───────────────────────────────────────────────────────

const mockSheetExpand = jest.fn();
const mockSheetClose = jest.fn();
const mockOnExitIndoor = jest.fn();
const mockOnOpenCalendar = jest.fn();
const mockHideAppSearchBar = jest.fn();
const mockRevealSearchBar = jest.fn();

let capturedSheetProps: {
  reOpenSearchBar: () => void;
  onPressBuilding: (b: BuildingShape) => void;
} | null = null;

// ─── Dependency mocks ─────────────────────────────────────────────────────────

jest.mock('@openspacelabs/react-native-zoomable-view', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    ReactNativeZoomableView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'zoomable-view' }, children),
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

jest.mock('../src/utils/floorPlans', () => ({
  floorPlans: {
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
  },
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

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('IndoorMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedSheetProps = null;
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
});
