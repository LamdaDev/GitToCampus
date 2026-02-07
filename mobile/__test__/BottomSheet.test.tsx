import React, { createRef } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BottomSlider, { BottomSliderHandle } from '../src/components/BottomSheet';

const mockSnapToIndex = jest.fn();
const mockClose = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    hotspots: {
              "Loyola Chapel": "https://www.concordia.ca/hospitality/venues/loyola-chapel.html"
            },
    services: {
              "Concordia Multi-Faith and Spirituality Centre": "https://www.concordia.ca/equity/spirituality.html"
            },
    address: "7141 Sherbrooke West",
  },
  {
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: "1515 Ste-Catherine W",
  },
];

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,

    // Mocks the ref needed to call open/close
    default: React.forwardRef((props, ref) => {
      // Mocks the handler for open/close calls to mock fn
      React.useImperativeHandle(ref, () => ({
        snapToIndex: mockSnapToIndex,
        close: mockClose,
      }));

      return <View testID="bottom-sheet">{props.children}</View>;
    }),
    BottomSheetView: ({ children }) => (
      <View testID="bottom-sheet-view">{children}</View>
    ),
  };
});

jest.mock('../src/components/BuildingDetails', () => {
  const React = require('react');
  const { Button, View } = require('react-native');

  return function MockBuildingDetails({ onClose }) {
    return (
      <View testID="building-details">
          <Button
            testID="close-button"
            title="Close"
            onPress={onClose}
          />
      </View>
    );
  };
});

describe('BottomSheet', () => {
  test('handles null selectedBuilding safely', () => {
    const ref = React.createRef<any>();

    expect(() =>
      render(<BottomSlider ref={ref} selectedBuilding={null} />)
    ).not.toThrow();
  });

  test('opens and closes the bottom sheet via Imperative Handler', () => {
    const ref = createRef<BottomSliderHandle>();

    const { getByTestId } = render(
      <BottomSlider ref={ref} selectedBuilding={null} />
    );

    // Check open and close events have been called
    ref.current?.open();
    expect(mockSnapToIndex).toHaveBeenCalledWith(0);

    // Check Close has been fired from child
    fireEvent.press(getByTestId('close-button'));
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders the BottomSheet components', () => {
    const ref = React.createRef<any>();

    const { getByTestId } = render(
      <BottomSlider ref={ref} selectedBuilding={null} />
    );

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-view')).toBeTruthy();
  });

  test('renders BuildingDetails when a building is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(
      <BottomSlider ref={ref} selectedBuilding={selectedBuilding} />
    );

    expect(getByTestId('building-details')).toBeTruthy();

    // Simulate pressing the close button
    fireEvent.press(getByTestId('close-button'));

    // The bottom sheet's close method should have been called
    expect(mockClose).toHaveBeenCalled();
  });
});