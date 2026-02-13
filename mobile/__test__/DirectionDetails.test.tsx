import { render, fireEvent } from '@testing-library/react-native';
import DirectionDetails from '../src/components/DirectionDetails';
import type { BuildingShape } from '../src/types/BuildingShape';
import React from 'react';

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

// Icons cause issues during test as they are loaded asynchronously
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => <span {...props} />,
    MaterialIcons: (props: any) => <span {...props} />,
    FontAwesome: (props: any) => <span {...props} />,
  };
});

describe('Direction Details', () => {
  test('renders selected building names', () => {
    const { getByText } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        selectMode={'destination'}
        onSelectStart={jest.fn()}
        onSelectDestination={jest.fn()}
      />,
    );

    expect(getByText('FC Building')).toBeTruthy();
    expect(getByText('EV Building')).toBeTruthy();
  });

  test('renders default placeholders when no building is selected', () => {
    const { getByText } = render(
      <DirectionDetails
        startBuilding={null}
        destinationBuilding={null}
        onClose={jest.fn()}
        selectMode={null}
        onSelectStart={jest.fn()}
        onSelectDestination={jest.fn()}
      />,
    );
  });

  test('updates activeIndex when transportation buttons are pressed', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        selectMode={null}
        onSelectStart={jest.fn()}
        onSelectDestination={jest.fn()}
      />,
    );

    const walkButton = getByTestId('transport-walk');
    const carButton = getByTestId('transport-car');
    const busButton = getByTestId('transport-bus');
  
    // Walk button starts active
    fireEvent.press(walkButton);  
    expect(walkButton.props.accessibilityState.selected).toBe(true);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(false);

    // Press car button
    fireEvent.press(carButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(true);
    expect(busButton.props.accessibilityState.selected).toBe(false);

    // Press bus button
    fireEvent.press(busButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(true);
  });
});
