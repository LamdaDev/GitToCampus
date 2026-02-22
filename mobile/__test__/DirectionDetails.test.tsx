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
    const onTravelModeChange = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        onTravelModeChange={onTravelModeChange}
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
    expect(onTravelModeChange).toHaveBeenLastCalledWith('walking');

    // Press car button
    fireEvent.press(carButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(true);
    expect(busButton.props.accessibilityState.selected).toBe(false);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('driving');

    // Press bus button
    fireEvent.press(busButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(true);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('transit');
    expect(onTravelModeChange).toHaveBeenCalledTimes(3);
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

  test('GO callback only fires when transit is selected and route is available', () => {
    const onPressTransitGo = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="26 mins"
        routeDistanceText="4.0 km"
        onPressTransitGo={onPressTransitGo}
      />,
    );

    fireEvent.press(getByTestId('route-go-button'));
    expect(onPressTransitGo).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('transport-bus'));
    fireEvent.press(getByTestId('route-go-button'));
    expect(onPressTransitGo).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('transport-walk'));
    fireEvent.press(getByTestId('route-go-button'));
    expect(onPressTransitGo).toHaveBeenCalledTimes(1);
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

  test('shows cross-campus label when route spans different campuses and summary is shown', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        isCrossCampusRoute={true}
      />,
    );

    expect(getByTestId('cross-campus-label')).toBeTruthy();
  });

  test('hides cross-campus label for non cross-campus routes', () => {
    const { queryByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[0]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        isCrossCampusRoute={false}
      />,
    );

    expect(queryByTestId('cross-campus-label')).toBeNull();
  });

  test('hides cross-campus label when no summary is available', () => {
    const { queryByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
      />,
    );

    expect(queryByTestId('cross-campus-label')).toBeNull();
  });

  test('shows route empty state when no route data is available', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
      />,
    );

    expect(getByTestId('route-empty-text')).toBeTruthy();
  });

  test('renders ETA in route secondary text when duration seconds are provided', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="5 mins"
        routeDistanceText="350 m"
        routeDurationSeconds={300}
      />,
    );

    expect(getByTestId('route-secondary-text').props.children).toContain('ETA - 350 m');
    nowSpy.mockRestore();
  });

  test('formats ETA hour as 12 when computed hour is 0', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(0);
    const hoursSpy = jest.spyOn(Date.prototype, 'getHours').mockReturnValue(0);
    const minutesSpy = jest.spyOn(Date.prototype, 'getMinutes').mockReturnValue(7);
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="5 mins"
        routeDistanceText="350 m"
        routeDurationSeconds={300}
      />,
    );

    expect(getByTestId('route-secondary-text').props.children).toContain('12:07 ETA - 350 m');
    nowSpy.mockRestore();
    hoursSpy.mockRestore();
    minutesSpy.mockRestore();
  });

  test('calls close/start/destination handlers when corresponding buttons are pressed', () => {
    const onClose = jest.fn();
    const onPressStart = jest.fn();
    const onPressDestination = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={null}
        destinationBuilding={null}
        onClose={onClose}
        userLocation={null}
        currentBuilding={null}
        onPressStart={onPressStart}
        onPressDestination={onPressDestination}
      />,
    );

    fireEvent.press(getByTestId('directions-close-button'));
    fireEvent.press(getByTestId('start-location-button'));
    fireEvent.press(getByTestId('destination-location-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPressStart).toHaveBeenCalledTimes(1);
    expect(onPressDestination).toHaveBeenCalledTimes(1);
  });
});
