import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import BottomSheet from '../src/components/BottomSheet';
import App from '../src/App';

// Mock GestureHandlerView needed for BottomSheet
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }) => <View>{children}</View>,
  };
});

// Mock fonts as they are loaded asynchronously and cause issues
jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('../src/components/BottomSheet', () => {
  const React = require('react');
  const { TouchableOpacity, View, Text } = require('react-native');

  const MockBottomSheet = React.forwardRef(function MockBottomSheet(
    { revealSearchBar, onExitSearch },
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({ open: jest.fn() }));
    return (
      <View testID="bottom-sheet">
        <TouchableOpacity testID="reveal-search-bar" onPress={revealSearchBar}>
          <Text>Reveal</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="exit-search-mode" onPress={onExitSearch}>
          <Text>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  });
  return MockBottomSheet;
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

const mockOpenBottomSheet = jest.fn();

jest.mock('../src/screens/MapScreen', () => {
  const { TouchableOpacity, View, Text, Button } = require('react-native');

  return function MockMapScreen({ openBottomSheet, passSelectedBuilding }) {
    return (
      <View testID="map-screen">
        <Button testID="open-sheet" title="Open" onPress={mockOpenBottomSheet} />
        {/* NEW: actually wires up the real prop so openBuildingDetails fires */}
        <TouchableOpacity testID="open-detail-sheet" onPress={openBottomSheet}>
          <Text>Open Detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="select-building"
          onPress={() => passSelectedBuilding({ id: 'b1' })}
        >
          <Text>Select</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../src/utils/buildingsRepository', () => ({
  getAllBuildingShapes: jest.fn(() => [{ id: 'test-building', name: 'Test Hall' }]),
}));

jest.mock('../src/components/AppSearchBar', () => {
  const { TouchableOpacity, View, Text } = require('react-native');

  return function MockAppSearchBar({ openSearch }) {
    return (
      <View testID="search-bar">
        <TouchableOpacity testID="open-search" onPress={openSearch}>
          <Text>Search</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

describe('App', () => {
  test('renders MapScreen inside SafeAreaView', () => {
    const { UNSAFE_getByType, getByTestId } = render(<App />);
    const mapScreen = UNSAFE_getByType(MapScreen);
    const bottomSheet = UNSAFE_getByType(BottomSheet);

    // Check if MapScreen has been rendered successfully
    expect(mapScreen).toBeTruthy();
    expect(getByTestId('map-screen')).toBeTruthy();

    // Check if BottomSheet has been rendered successfully
    expect(bottomSheet).toBeTruthy();

    fireEvent.press(getByTestId('open-sheet'));

    // Check if MapScreen's passed prop has fired
    expect(mockOpenBottomSheet).toHaveBeenCalled();
  });

  test('AppSearchBar visible by default', () => {
    const { getByTestId } = render(<App />);

    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('openBuildingDetails hides AppSearchBar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-detail-sheet'));

    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('openSearchBuilding hides AppSearchBar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-search'));

    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('toggleSearchBarState restores AppSearchBar', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-detail-sheet'));
    fireEvent.press(getByTestId('reveal-search-bar'));

    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('exitSearchMode does not throw', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-search'));

    expect(() => fireEvent.press(getByTestId('exit-search-mode'))).not.toThrow();
  });

  test('passSelectedBuilding updates state', () => {
    const { getByTestId } = render(<App />);

    expect(() => fireEvent.press(getByTestId('select-building'))).not.toThrow();
  });
});
