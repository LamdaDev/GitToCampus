import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import IndoorBottomSheet from '../src/components/indoor/BuildingListSheet';
import type { IndoorBottomSheetRef } from '../src/components/indoor/BuildingListSheet';

// ─── Top-level mock fns ───────────────────────────────────────────────────────

const mockSheetExpand = jest.fn();
const mockSheetClose = jest.fn();
const mockOnPressBuilding = jest.fn();
const mockReOpenSearchBar = jest.fn();

// Captures onClose so tests can simulate the BottomSheet pan-down-to-close gesture
let capturedOnClose: (() => void) | null = null;

// ─── Dependency mocks ─────────────────────────────────────────────────────────

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockBottomSheet = React.forwardRef((props: any, ref: any) => {
    capturedOnClose = props.onClose ?? null;
    React.useImperativeHandle(ref, () => ({
      expand: mockSheetExpand,
      close: mockSheetClose,
    }));
    return React.createElement(View, { testID: 'bottom-sheet' }, props.children);
  });
  MockBottomSheet.displayName = 'MockBottomSheet';

  const MockBottomSheetFlatList = (props: any) => {
    const { View } = require('react-native');
    return React.createElement(
      View,
      { testID: 'flat-list' },
      props.data?.map((item: any) =>
        React.cloneElement(props.renderItem({ item }), { key: props.keyExtractor(item) }),
      ),
    );
  };

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetFlatList: MockBottomSheetFlatList,
  };
});

jest.mock('react-native-elements', () => ({
  SearchBar: ({ onChangeText, value }: { onChangeText: (t: string) => void; value: string }) => {
    const React = require('react');
    const { TextInput } = require('react-native');
    return React.createElement(TextInput, {
      testID: 'search-bar',
      onChangeText,
      value,
    });
  },
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('../src/styles/SearchBuilding.styles', () => ({
  searchBuilding: {},
}));

jest.mock('../src/styles/IndoorBottomSheet.styles', () => ({
  indoorBuildingSheetStyles: {},
}));

jest.mock('../src/utils/floorPlans', () => ({
  floorPlans: {
    H: { 1: {}, 2: {} },
    MB: { 1: {} },
    CC: { 1: {} },
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const defaultProps = {
  onPressBuilding: mockOnPressBuilding,
  reOpenSearchBar: mockReOpenSearchBar,
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('IndoorBottomSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnClose = null;
  });

  test('renders bottom sheet and building list derived from floorPlans', () => {
    const { getByTestId, getByText } = render(<IndoorBottomSheet {...defaultProps} />);

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('flat-list')).toBeTruthy();
    // One item per floorPlans key: H, MB, CC
    expect(getByText('H Building')).toBeTruthy();
    expect(getByText('MB Building')).toBeTruthy();
    expect(getByText('CC Building')).toBeTruthy();
  });

  test('ref.open() calls sheetRef.expand() and ref.close() calls sheetRef.close()', () => {
    const ref = React.createRef<IndoorBottomSheetRef>();
    render(<IndoorBottomSheet {...defaultProps} ref={ref} />);

    ref.current!.open();
    expect(mockSheetExpand).toHaveBeenCalledTimes(1);

    ref.current!.close();
    expect(mockSheetClose).toHaveBeenCalledTimes(1);
  });

  test('calls onPressBuilding with the correct building when a list item is pressed', () => {
    const { getByText } = render(<IndoorBottomSheet {...defaultProps} />);

    fireEvent.press(getByText('H Building'));

    expect(mockOnPressBuilding).toHaveBeenCalledTimes(1);
    expect(mockOnPressBuilding).toHaveBeenCalledWith(
      expect.objectContaining({ shortCode: 'H', name: 'H Building' }),
    );
  });

  test('calls reOpenSearchBar when BottomSheet onClose fires', () => {
    render(<IndoorBottomSheet {...defaultProps} />);

    capturedOnClose?.();

    expect(mockReOpenSearchBar).toHaveBeenCalledTimes(1);
  });

  test('filters buildings by search query and clears when query is empty', async () => {
    const { getByTestId, getByText, queryByText } = render(<IndoorBottomSheet {...defaultProps} />);

    // Type a query that matches only H Building
    fireEvent.changeText(getByTestId('search-bar'), 'H Building');

    await waitFor(() => {
      expect(getByText('H Building')).toBeTruthy();
      expect(queryByText('MB Building')).toBeNull();
      expect(queryByText('CC Building')).toBeNull();
    });

    // Clear the query — all buildings should return
    fireEvent.changeText(getByTestId('search-bar'), '');

    await waitFor(() => {
      expect(getByText('H Building')).toBeTruthy();
      expect(getByText('MB Building')).toBeTruthy();
      expect(getByText('CC Building')).toBeTruthy();
    });
  });

  test('filters buildings by partial address match', async () => {
    const { getByTestId, getByText, queryByText } = render(<IndoorBottomSheet {...defaultProps} />);

    // H and MB share '1455 De Maisonneuve' — MB has '1450 Guy St.'
    fireEvent.changeText(getByTestId('search-bar'), 'guy');

    await waitFor(() => {
      expect(getByText('MB Building')).toBeTruthy();
      expect(queryByText('H Building')).toBeNull();
    });
  });

  test('shows no buildings when query matches nothing', async () => {
    const { getByTestId, queryByText } = render(<IndoorBottomSheet {...defaultProps} />);

    fireEvent.changeText(getByTestId('search-bar'), 'zzznotfound');

    await waitFor(() => {
      expect(queryByText('H Building')).toBeNull();
      expect(queryByText('MB Building')).toBeNull();
      expect(queryByText('CC Building')).toBeNull();
    });
  });
});
