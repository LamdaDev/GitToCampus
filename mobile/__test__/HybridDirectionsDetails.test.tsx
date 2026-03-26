import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import HybridDirectionsDetails from '../src/components/HybridDirectionsDetails';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');

  return {
    FontAwesome: ({ name }: { name: string }) => <Text>{name}</Text>,
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('react-native-paper', () => {
  const { View } = require('react-native');

  return {
    Divider: ({ style }: { style?: object }) => <View testID="mock-divider" style={style} />,
  };
});

describe('HybridDirectionsDetails', () => {
  test('renders both navigation sections, endpoint labels, and the GO button', () => {
    const { getByText, getByTestId } = render(
      <HybridDirectionsDetails
        onClose={jest.fn()}
        startLabel="H-811"
        destinationLabel="EV Building"
        selectedIndoorMode="walking"
        selectedOutdoorMode="walking"
        onIndoorModeChange={jest.fn()}
        onOutdoorModeChange={jest.fn()}
      />,
    );

    expect(getByTestId('hybrid-directions-details')).toBeTruthy();
    expect(getByText('Indoor Navigation')).toBeTruthy();
    expect(getByText('Outdoor Navigation')).toBeTruthy();
    expect(getByText('H-811')).toBeTruthy();
    expect(getByText('EV Building')).toBeTruthy();
    expect(getByTestId('hybrid-go-button')).toBeTruthy();
  });

  test('toggles indoor and outdoor mode buttons through the provided callbacks', () => {
    const onIndoorModeChange = jest.fn();
    const onOutdoorModeChange = jest.fn();
    const { getByTestId } = render(
      <HybridDirectionsDetails
        onClose={jest.fn()}
        startLabel="H-811"
        destinationLabel="VE-1.615"
        selectedIndoorMode="walking"
        selectedOutdoorMode="walking"
        onIndoorModeChange={onIndoorModeChange}
        onOutdoorModeChange={onOutdoorModeChange}
      />,
    );

    fireEvent.press(getByTestId('hybrid-indoor-disability'));
    fireEvent.press(getByTestId('hybrid-outdoor-driving'));
    fireEvent.press(getByTestId('hybrid-outdoor-transit'));
    fireEvent.press(getByTestId('hybrid-outdoor-shuttle'));

    expect(onIndoorModeChange).toHaveBeenCalledWith('disability');
    expect(onOutdoorModeChange).toHaveBeenNthCalledWith(1, 'driving');
    expect(onOutdoorModeChange).toHaveBeenNthCalledWith(2, 'transit');
    expect(onOutdoorModeChange).toHaveBeenNthCalledWith(3, 'shuttle');
  });

  test('wires start, destination, clear, close, and go actions', () => {
    const onPressStart = jest.fn();
    const onPressDestination = jest.fn();
    const onPressGo = jest.fn();
    const onClose = jest.fn();
    const onClear = jest.fn();
    const { getByTestId } = render(
      <HybridDirectionsDetails
        onClose={onClose}
        onClear={onClear}
        startLabel="H-811"
        destinationLabel="VE-1.615"
        selectedIndoorMode="walking"
        selectedOutdoorMode="walking"
        onIndoorModeChange={jest.fn()}
        onOutdoorModeChange={jest.fn()}
        onPressStart={onPressStart}
        onPressDestination={onPressDestination}
        onPressGo={onPressGo}
      />,
    );

    fireEvent.press(getByTestId('hybrid-start-location-button'));
    fireEvent.press(getByTestId('hybrid-destination-location-button'));
    fireEvent.press(getByTestId('hybrid-clear-button'));
    fireEvent.press(getByTestId('hybrid-directions-close-button'));
    fireEvent.press(getByTestId('hybrid-go-button'));

    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressDestination).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPressGo).toHaveBeenCalledTimes(1);
  });
});
