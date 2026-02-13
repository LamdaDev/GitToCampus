import React, { createRef } from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BottomSlider, { BottomSliderHandle } from '../src/components/BottomSheet';
import { BuildingShape } from '../src/types/BuildingShape';

const mockSnapToIndex = jest.fn();
const mockClose = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    polygons: [],
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    hotspots: {
      'Loyola Chapel': 'https://www.concordia.ca/hospitality/venues/loyola-chapel.html',
    },
    services: {
      'Concordia Multi-Faith and Spirituality Centre':
        'https://www.concordia.ca/equity/spirituality.html',
    },
    address: '7141 Sherbrooke West',
  },
  {
    polygons: [],
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: '1515 Ste-Catherine W',
  },
];

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  type MockProps = {
    children?: React.ReactNode;
  };

  return {
    __esModule: true,

    default: React.forwardRef((props: { children: any }, ref: any) => {
      const React = require('react');
      const { View } = require('react-native');

      React.useImperativeHandle(ref, () => ({
        snapToIndex: mockSnapToIndex,
        close: mockClose,
      }));

      return <View testID="bottom-sheet">{props.children}</View>;
    }),
    BottomSheetView: ({ children }: MockProps) => (
      <View testID="bottom-sheet-view">{children}</View>
    ),
  };
});

jest.mock('../src/components/BuildingDetails', () => {
  const { View, Button } = require('react-native');

  type MockProps = {
    onClose: () => void;
    onShowDirections?: (building: any) => void;
  };

  const MockBuildingDetails: React.FC<MockProps> = ({ onClose, onShowDirections }) => (
    <View testID="building-details">
      <Button testID="close-button" title="Close" onPress={onClose} />
      <Button
        testID="on-show-directions"
        title="Directions"
        onPress={() => onShowDirections?.({ id: 'mock-building' })}
      />
    </View>
  );

  return MockBuildingDetails;
});

jest.mock('../src/components/DirectionDetails', () => {
  const { View, Text, TouchableOpacity } = require('react-native');

  // Mock component
  return ({ destinationBuilding }: any) => {
    // Lazy import of mockClose
    const { mockClose } = require('./BottomSheet.test'); // must be inside function

    return (
      <View testID="direction-details">
        <Text testID="destination-id">{destinationBuilding ? destinationBuilding.id : 'none'}</Text>

        <TouchableOpacity testID="close-directions-button" onPress={mockClose}>
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

describe('BottomSheet', () => {
  test('handles null selectedBuilding safely', () => {
    const ref = React.createRef<any>();

    expect(() => render(<BottomSlider ref={ref} selectedBuilding={null} />)).not.toThrow();
  });

  test('opens and closes the bottom sheet via Imperative Handler', () => {
    const ref = createRef<BottomSliderHandle>();

    const { getByTestId } = render(<BottomSlider ref={ref} selectedBuilding={null} />);

    // Check open and close events have been called
    ref.current?.open();
    expect(mockSnapToIndex).toHaveBeenCalledWith(0);

    // Check Close has been fired from child
    fireEvent.press(getByTestId('close-button'));
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders the BottomSheet components', () => {
    const ref = React.createRef<any>();

    const { getByTestId } = render(<BottomSlider ref={ref} selectedBuilding={null} />);

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-view')).toBeTruthy();
  });

  test('renders BuildingDetails when a building is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(<BottomSlider ref={ref} selectedBuilding={selectedBuilding} />);

    expect(getByTestId('building-details')).toBeTruthy();

    // Simulate pressing the close button
    fireEvent.press(getByTestId('close-button'));

    // The bottom sheet's close method should have been called
    expect(mockClose).toHaveBeenCalled();
  });

  test('renders DirectionDetails when onShowDirections is called', () => {
    const ref = React.createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId, queryByTestId } = render(
      <BottomSlider ref={ref} selectedBuilding={selectedBuilding} />,
    );

    // Initially, DirectionDetails should not be visible
    expect(queryByTestId('direction-details')).toBeNull();

    // Press the onShowDirections button inside BuildingDetails
    fireEvent.press(getByTestId('on-show-directions'));

    // Now DirectionDetails should be rendered
    expect(getByTestId('direction-details')).toBeTruthy();

    // Optionally test closing DirectionDetails
    fireEvent.press(getByTestId('close-directions-button'));
    expect(mockClose).toHaveBeenCalled();
  });

  test('useEffect does NOT set destinationBuilding when selecting same building', () => {
    const ref = React.createRef<any>();

    const { getByTestId, rerender } = render(
      <BottomSlider ref={ref} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));

    // Re-select SAME building
    rerender(<BottomSlider ref={ref} selectedBuilding={mockBuildings[0]} />);

    expect(getByTestId('destination-id').props.children).toBe('sgw-1');
  });
});
