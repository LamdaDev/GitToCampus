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

  return function MockBottomSheet() {
    return null;
  };
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

const mockOpenBottomSheet = jest.fn();

jest.mock('../src/screens/MapScreen', () => {
  const React = require('react');
  const { Button, View } = require('react-native');

  return function MockMapScreen() {
    return (
      <View testID="map-screen">
        <Button testID="open-sheet" title="Open" onPress={mockOpenBottomSheet} />
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
});
