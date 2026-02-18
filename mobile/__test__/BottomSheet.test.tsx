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

const defaultProps = {
  mode: 'detail' as const,
  revealSearchBar: jest.fn(),
  buildings: mockBuildings,
  onExitSearch: jest.fn(),
  passSelectedBuilding: jest.fn(),
  userLocation: null,
  currentBuilding: null,
};

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');

  type MockProps = {
    children?: React.ReactNode;
  };

  return {
    __esModule: true,

    default: React.forwardRef((props: { children: any; onClose?: () => void }, ref: any) => {
      const React = require('react');
      const { View, TouchableOpacity, Text } = require('react-native');

      React.useImperativeHandle(ref, () => ({
        snapToIndex: mockSnapToIndex,
        close: mockClose,
      }));

      return (
        <View testID="bottom-sheet">
          <TouchableOpacity testID="trigger-on-close" onPress={props.onClose}>
            <Text>Trigger Close</Text>
          </TouchableOpacity>
          {props.children}
        </View>
      );
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

  return ({ destinationBuilding, onClose, onPressStart, onPressDestination }: any) => (
    <View testID="direction-details">
      <Text testID="destination-id">{destinationBuilding ? destinationBuilding.id : 'none'}</Text>
      <TouchableOpacity testID="close-directions-button" onPress={onClose}>
        <Text>Close</Text>
      </TouchableOpacity>
      {/* NEW: exposes lines 137-138 */}
      <TouchableOpacity testID="press-start" onPress={onPressStart}>
        <Text>Start</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="press-destination" onPress={onPressDestination}>
        <Text>Destination</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/components/SearchSheet', () => {
  const { View, TouchableOpacity, Text } = require('react-native');
  return ({ onPressBuilding }: any) => (
    <View testID="search-sheet">
      <TouchableOpacity
        testID="press-building-in-search"
        onPress={() =>
          onPressBuilding({ id: 'found-building', name: 'Found Hall', polygons: [], campus: 'SGW' })
        }
      >
        <Text>Select</Text>
      </TouchableOpacity>
    </View>
  );
});

describe('BottomSheet', () => {
  test('handles null selectedBuilding safely', () => {
    const ref = React.createRef<any>();

    expect(() =>
      render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />),
    ).not.toThrow();
  });

  test('opens and closes the bottom sheet via Imperative Handler', () => {
    const ref = createRef<BottomSliderHandle>();

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
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
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />,
    );

    expect(getByTestId('bottom-sheet')).toBeTruthy();
    expect(getByTestId('bottom-sheet-view')).toBeTruthy();
  });

  test('renders BuildingDetails when a building is selected', () => {
    const ref = createRef<BottomSliderHandle>();
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
    );

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
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={selectedBuilding} />,
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
      <BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />,
    );
    const directionDetailsButton = getByTestId('on-show-directions');

    fireEvent.press(directionDetailsButton);

    // Re-select SAME building
    rerender(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={mockBuildings[0]} />);

    const destinationBuildingID = getByTestId('destination-id').props.children;

    expect(destinationBuildingID).toBe('sgw-1');
  });

  test('setSnap calls snapToIndex via imperative handle', () => {
    const ref = createRef<BottomSliderHandle>();
    render(<BottomSlider {...defaultProps} ref={ref} selectedBuilding={null} />);
    ref.current?.setSnap(1);

    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
  });

  test('handleSheetClose calls revealSearchBar', () => {
    const revealSearchBar = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        revealSearchBar={revealSearchBar}
      />,
    );
    fireEvent.press(getByTestId('trigger-on-close'));

    expect(revealSearchBar).toHaveBeenCalled();
  });

  test('renders SearchSheet when mode is search', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('selecting a building in search mode calls passSelectedBuilding and onExitSearch', () => {
    const passSelectedBuilding = jest.fn();
    const onExitSearch = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={null}
        mode="search"
        passSelectedBuilding={passSelectedBuilding}
        onExitSearch={onExitSearch}
      />,
    );

    fireEvent.press(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(onExitSearch).toHaveBeenCalled();
  });

  test('pressing start in directions shows SearchSheet', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );
    fireEvent.press(getByTestId('on-show-directions'));
    fireEvent.press(getByTestId('press-start'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('pressing destination in directions shows SearchSheet', () => {
    const { getByTestId } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));
    fireEvent.press(getByTestId('press-destination'));

    expect(getByTestId('search-sheet')).toBeTruthy();
  });

  test('selecting a building from internal search returns to directions view', () => {
    const passSelectedBuilding = jest.fn();
    const { getByTestId } = render(
      <BottomSlider
        {...defaultProps}
        ref={createRef()}
        selectedBuilding={mockBuildings[0]}
        passSelectedBuilding={passSelectedBuilding}
      />,
    );

    fireEvent.press(getByTestId('on-show-directions'));
    fireEvent.press(getByTestId('press-start'));
    fireEvent.press(getByTestId('press-building-in-search'));

    expect(passSelectedBuilding).toHaveBeenCalled();
    expect(getByTestId('direction-details')).toBeTruthy();
  });

  test('snaps to index 1 when mode switches to search', () => {
    jest.useFakeTimers();

    const { rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="detail" />,
    );

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={null} mode="search" />,
    );

    jest.runAllTimers();
    expect(mockSnapToIndex).toHaveBeenCalledWith(1);
    jest.useRealTimers();
  });

  test('useEffect sets destinationBuilding when selectedBuilding changes in directions view', () => {
    const { getByTestId, rerender } = render(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[0]} />,
    );

    fireEvent.press(getByTestId('on-show-directions'));

    rerender(
      <BottomSlider {...defaultProps} ref={createRef()} selectedBuilding={mockBuildings[1]} />,
    );

    expect(getByTestId('destination-id').props.children).toBe('loy-1');
  });
});
