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
        userLocation={null}
        currentBuilding={null}
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
        userLocation={null}
        currentBuilding={null}
      />,
    );

    expect(getByText('Set as starting point')).toBeTruthy();
    expect(getByText('Set destination')).toBeTruthy();
  });

  test('displays "My Location" when user location is available but not in a building', () => {
    const { getByText } = render(
      <DirectionDetails
        startBuilding={null}
        destinationBuilding={null}
        onClose={jest.fn()}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
        currentBuilding={null}
      />,
    );

    expect(getByText('My Location')).toBeTruthy();
  });

  test('displays current building with "My Location" suffix when user is in a building', () => {
    const { getByText } = render(
      <DirectionDetails
        startBuilding={null}
        destinationBuilding={null}
        onClose={jest.fn()}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
        currentBuilding={mockBuildings[0]}
      />,
    );

    expect(getByText('FC Building (My Location)')).toBeTruthy();
  });

  test('prioritizes explicit start building over current location', () => {
    const { getByText, queryByText } = render(
      <DirectionDetails
        startBuilding={mockBuildings[1]}
        destinationBuilding={null}
        onClose={jest.fn()}
        userLocation={{ latitude: 45.5, longitude: -73.57 }}
        currentBuilding={mockBuildings[0]}
      />,
    );

    expect(getByText('EV Building')).toBeTruthy();
    expect(queryByText('My Location')).toBeNull();
  });

  test('updates activeIndex when transportation buttons are pressed', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
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

  test('shows loading state when route is loading', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isRouteLoading={true}
      />,
    );

    expect(getByTestId('route-loading-text')).toBeTruthy();
  });

  test('shows route summary card when distance and duration are available', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
      />,
    );

    expect(getByTestId('route-summary-text').props.children).toBe('14 mins');
    expect(getByTestId('route-secondary-text').props.children).toBe('1.2 km');
    expect(getByTestId('route-go-button')).toBeTruthy();
  });

  test('shows route error text when route loading fails', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeErrorMessage="Unable to load route. Please try again."
      />,
    );

    expect(getByTestId('route-error-text')).toBeTruthy();
  });
});
