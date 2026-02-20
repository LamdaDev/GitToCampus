import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import MapControls from '../src/components/MapControls';
import * as ReactNative from 'react-native';

const mockAnimatedStyles: Array<{ bottom: number }> = [];

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (updater: () => { bottom: number }) => {
      const style = updater();
      mockAnimatedStyles.push(style);
      return style;
    },
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

describe('MapControls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnimatedStyles.length = 0;
  });

  test('uses default bottom offset and fires control handlers', () => {
    const onToggleCampus = jest.fn();
    const onRecenter = jest.fn();

    const { getByLabelText, getByText } = render(
      <MapControls selectedCampus="SGW" onToggleCampus={onToggleCampus} onRecenter={onRecenter} />,
    );

    expect(getByText('SGW')).toBeTruthy();
    expect(mockAnimatedStyles[mockAnimatedStyles.length - 1]).toEqual({ bottom: 110 });

    const toggleButton = getByLabelText('Toggle Campus');
    const recenterButton = getByLabelText('Recenter Map');

    fireEvent.press(toggleButton);
    fireEvent.press(recenterButton);

    expect(onToggleCampus).toHaveBeenCalledTimes(1);
    expect(onRecenter).toHaveBeenCalledTimes(1);
  });

  test('positions controls above a visible bottom sheet when animated position is provided', () => {
    const windowHeight = ReactNative.Dimensions.get('window').height;
    const sheetTop = 760;
    const expectedBottom = Math.max(110, Math.max(0, windowHeight - sheetTop) + 16);

    render(
      <MapControls
        selectedCampus="LOYOLA"
        onToggleCampus={jest.fn()}
        onRecenter={jest.fn()}
        bottomSheetAnimatedPosition={{ value: sheetTop } as any}
      />,
    );

    expect(mockAnimatedStyles[mockAnimatedStyles.length - 1]).toEqual({ bottom: expectedBottom });
  });

  test('clamps animated offset to the base position when sheet overlap is small', () => {
    const windowHeight = ReactNative.Dimensions.get('window').height;

    render(
      <MapControls
        selectedCampus="LOYOLA"
        onToggleCampus={jest.fn()}
        onRecenter={jest.fn()}
        bottomSheetAnimatedPosition={{ value: windowHeight } as any}
      />,
    );

    expect(mockAnimatedStyles[mockAnimatedStyles.length - 1]).toEqual({ bottom: 110 });
  });
});
