import { render, fireEvent } from '@testing-library/react-native';
import BuildingDetails from '../src/components/BuildingDetails';
import type { BuildingShape } from '../src/types/BuildingShape';
import React from 'react';

const mockOnClose = jest.fn();
const mockOnShowDirections = jest.fn();

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
    shortCode: 'FC',
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
  return {
    Ionicons: (props: any) => <span {...props} />,
    MaterialIcons: (props: any) => <span {...props} />,
    FontAwesome: (props: any) => <span {...props} />,
  };
});

describe('Building Details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Retrieve building details on the selected building', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    expect(getByText('FC Building')).toBeTruthy();
    expect(getByText('Loyola Chapel')).toBeTruthy();
    expect(getByText('(FC) 7141 Sherbrooke West')).toBeTruthy();
  });

  test('Hotspots and Services are absent when the building has none', () => {
    const selectedBuilding = mockBuildings[1];

    const { getByText, queryByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    expect(getByText('EV Building')).toBeTruthy();
    expect(queryByText('HotSpots')).toBeNull();
    expect(queryByText('Services')).toBeNull();
  });

  test('"Set as starting point" button calls onShowDirections with building as start', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    const setStartButton = getByText('Set as starting point');
    fireEvent.press(setStartButton);

    expect(mockOnShowDirections).toHaveBeenCalledWith(selectedBuilding);
    expect(mockOnShowDirections).toHaveBeenCalledTimes(1);
  });

  test('Walking figure button calls onShowDirections with building as destination', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByTestId } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    const walkingButton = getByTestId('walking-figure-button');
    fireEvent.press(walkingButton);

    expect(mockOnShowDirections).toHaveBeenCalledWith(selectedBuilding, true);
    expect(mockOnShowDirections).toHaveBeenCalledTimes(1);
  });
});
