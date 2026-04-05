import { render, fireEvent, act } from '@testing-library/react-native';
import DirectionDetails from '../src/components/DirectionDetails';
import type { BuildingShape } from '../src/types/BuildingShape';
import React from 'react';
import { PanResponder } from 'react-native';

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
    const shuttleButton = getByTestId('transport-shuttle');

    // Walk button starts active
    fireEvent.press(walkButton);
    expect(walkButton.props.accessibilityState.selected).toBe(true);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(false);
    expect(shuttleButton.props.accessibilityState.selected).toBe(false);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('walking');

    // Press car button
    fireEvent.press(carButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(true);
    expect(busButton.props.accessibilityState.selected).toBe(false);
    expect(shuttleButton.props.accessibilityState.selected).toBe(false);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('driving');

    // Press bus button
    fireEvent.press(busButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(true);
    expect(shuttleButton.props.accessibilityState.selected).toBe(false);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('transit');

    // Press shuttle button
    fireEvent.press(shuttleButton);
    expect(walkButton.props.accessibilityState.selected).toBe(false);
    expect(carButton.props.accessibilityState.selected).toBe(false);
    expect(busButton.props.accessibilityState.selected).toBe(false);
    expect(shuttleButton.props.accessibilityState.selected).toBe(true);
    expect(onTravelModeChange).toHaveBeenLastCalledWith('shuttle');
    expect(onTravelModeChange).toHaveBeenCalledTimes(4);
  });

  test('renders four transport options (walk, car, transit, shuttle)', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
      />,
    );

    expect(getByTestId('transport-walk')).toBeTruthy();
    expect(getByTestId('transport-car')).toBeTruthy();
    expect(getByTestId('transport-bus')).toBeTruthy();
    expect(getByTestId('transport-shuttle')).toBeTruthy();
  });

  test('renders the staged route action button and triggers it when provided', () => {
    const onStageAction = jest.fn();
    const { getByTestId, getByText } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        stageActionLabel="Enter Building"
        onStageAction={onStageAction}
      />,
    );

    expect(getByText('Enter Building')).toBeTruthy();
    fireEvent.press(getByTestId('route-stage-action-button'));
    expect(onStageAction).toHaveBeenCalledTimes(1);
  });

  test('renders route retry button and calls callback on route error', () => {
    const onRetryRoute = jest.fn();
    const { getByTestId, getByText } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeErrorMessage="Unable to load route. Please try again."
        onRetryRoute={onRetryRoute}
      />,
    );

    expect(getByText('Unable to load route. Please try again.')).toBeTruthy();
    fireEvent.press(getByTestId('route-retry-button'));
    expect(onRetryRoute).toHaveBeenCalledTimes(1);
  });

  test('renders shuttle card details when shuttle is selected on cross-campus routes', () => {
    const onTravelModeChange = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: {
            id: 'loy-ad',
            campus: 'LOYOLA',
            name: 'Loyola Shuttle Stop (AD Building)',
            coords: { latitude: 45.458317, longitude: -73.640225 },
          },
          dropoff: {
            id: 'sgw-hall',
            campus: 'SGW',
            name: 'SGW Shuttle Stop (Hall Building)',
            coords: { latitude: 45.497193, longitude: -73.578985 },
          },
          nextDepartures: ['9:20 AM', '9:40 AM'],
          nextDepartureDates: [],
          nextDepartureInMinutes: 10,
          isServiceAvailable: true,
        }}
        onTravelModeChange={onTravelModeChange}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));
    expect(onTravelModeChange).toHaveBeenLastCalledWith('shuttle');
    expect(getByTestId('shuttle-card-content')).toBeTruthy();
    expect(getByTestId('shuttle-direction-label').props.children).toBe('LOY -> SGW');
    expect(getByTestId('shuttle-next-bus-text').props.children).toContain('Next bus in 10');
    expect(queryByTestId('shuttle-pickup-text')).toBeNull();
    expect(queryByTestId('shuttle-dropoff-text')).toBeNull();
    expect(queryByTestId('route-summary-text')).toBeNull();
    expect(queryByTestId('route-go-button')).toBeNull();
  });

  test('shows Shuttle Unavailable card for same-campus shuttle routes', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[0]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={false}
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: null,
          dropoff: null,
          nextDepartures: [],
          nextDepartureDates: [],
          nextDepartureInMinutes: null,
          isServiceAvailable: false,
          message: 'Shuttle service not available right now. Try Public Transit.',
        }}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));
    expect(getByTestId('shuttle-card-content')).toBeTruthy();
    expect(getByTestId('shuttle-unavailable-text').props.children).toBe(
      'Shuttle service not available right now. Try Public Transit.',
    );
    expect(getByTestId('shuttle-full-schedule-button')).toBeTruthy();
  });

  test('calls onPressShuttleSchedule when schedule button is pressed', () => {
    const onPressShuttleSchedule = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        onPressShuttleSchedule={onPressShuttleSchedule}
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: null,
          dropoff: null,
          nextDepartures: ['9:20 AM'],
          nextDepartureDates: [],
          nextDepartureInMinutes: 10,
          isServiceAvailable: true,
        }}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));
    fireEvent.press(getByTestId('shuttle-full-schedule-button'));
    expect(onPressShuttleSchedule).toHaveBeenCalledTimes(1);
  });

  test('shows only unavailable message when no shuttle buses are available', () => {
    const { getByTestId, queryByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: {
            id: 'loy-ad',
            campus: 'LOYOLA',
            name: 'Loyola Shuttle Stop (AD Building)',
            coords: { latitude: 45.458317, longitude: -73.640225 },
          },
          dropoff: {
            id: 'sgw-hall',
            campus: 'SGW',
            name: 'SGW Shuttle Stop (Hall Building)',
            coords: { latitude: 45.497193, longitude: -73.578985 },
          },
          nextDepartures: [],
          nextDepartureDates: [],
          nextDepartureInMinutes: null,
          isServiceAvailable: false,
          message: 'Shuttle bus unavailable today. Try Public Transit.',
        }}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));

    expect(getByTestId('shuttle-unavailable-text').props.children).toBe(
      'Shuttle bus unavailable today. Try Public Transit.',
    );
    expect(queryByTestId('shuttle-direction-label')).toBeNull();
    expect(queryByTestId('shuttle-pickup-text')).toBeNull();
    expect(queryByTestId('shuttle-dropoff-text')).toBeNull();
    expect(queryByTestId('route-summary-text')).toBeNull();
    expect(queryByTestId('route-go-button')).toBeNull();
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
    expect(getByTestId('route-summary-text').props.adjustsFontSizeToFit).toBe(true);
    expect(getByTestId('route-summary-text').props.minimumFontScale).toBe(0.72);
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

  test('calls onSwapLocations when either drag handle is pressed', () => {
    const onSwapLocations = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        onSwapLocations={onSwapLocations}
      />,
    );

    fireEvent.press(getByTestId('destination-location-drag-handle'));

    expect(onSwapLocations).toHaveBeenCalledTimes(1);
  });

  test('calls onPressGo with walking and driving when navigation is allowed', () => {
    const onPressGo = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        onPressGo={onPressGo}
      />,
    );

    fireEvent.press(getByTestId('route-go-button'));
    fireEvent.press(getByTestId('transport-car'));
    fireEvent.press(getByTestId('route-go-button'));

    expect(onPressGo).toHaveBeenNthCalledWith(1, 'walking');
    expect(onPressGo).toHaveBeenNthCalledWith(2, 'driving');
  });

  test('hides GO for walking when custom start disables navigation start', () => {
    const { queryByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        canStartNavigation={false}
      />,
    );

    expect(queryByTestId('route-go-button')).toBeNull();
  });

  test('still shows GO for transit when custom start disables navigation start', () => {
    const onPressGo = jest.fn();
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
        canStartNavigation={false}
        onPressGo={onPressGo}
      />,
    );

    fireEvent.press(getByTestId('transport-bus'));
    fireEvent.press(getByTestId('route-go-button'));

    expect(onPressGo).toHaveBeenCalledWith('transit');
  });

  test('syncs active transport mode from selectedTravelMode prop changes', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        selectedTravelMode="walking"
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
      />,
    );

    expect(getByTestId('transport-walk').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('transport-bus').props.accessibilityState.selected).toBe(false);
    expect(getByTestId('transport-shuttle').props.accessibilityState.selected).toBe(false);
    expect(queryByTestId('shuttle-card-content')).toBeNull();

    rerender(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        selectedTravelMode="transit"
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
      />,
    );

    expect(getByTestId('transport-bus').props.accessibilityState.selected).toBe(true);
    expect(queryByTestId('shuttle-card-content')).toBeNull();

    rerender(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        selectedTravelMode="shuttle"
        routeDurationText="14 mins"
        routeDistanceText="1.2 km"
      />,
    );

    expect(getByTestId('transport-shuttle').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('shuttle-card-content')).toBeTruthy();
  });

  test('shows singular minute text and inferred SGW -> LOY direction when shuttle direction is missing', () => {
    const { getByTestId, getByText } = render(
      <DirectionDetails
        startBuilding={{ ...mockBuildings[1], campus: 'SGW' }}
        destinationBuilding={{ ...mockBuildings[0], campus: 'LOYOLA' }}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        shuttlePlan={
          {
            direction: undefined,
            pickup: null,
            dropoff: null,
            nextDepartures: ['9:30 AM'],
            nextDepartureDates: [],
            nextDepartureInMinutes: 1,
            isServiceAvailable: true,
          } as any
        }
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));

    expect(getByTestId('shuttle-next-bus-text').props.children).toBe('Next bus in 1 min');
    expect(getByText('SGW -> LOY')).toBeTruthy();
  });

  test('shows fallback next-bus text when service is available but minutes are missing', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: null,
          dropoff: null,
          nextDepartures: ['9:30 AM'],
          nextDepartureDates: [],
          nextDepartureInMinutes: null,
          isServiceAvailable: true,
        }}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));
    expect(getByTestId('shuttle-next-bus-text').props.children).toBe('Next bus time unavailable');
  });

  test('uses default unavailable shuttle message when no custom message is provided', () => {
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        isCrossCampusRoute={true}
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: null,
          dropoff: null,
          nextDepartures: [],
          nextDepartureDates: [],
          nextDepartureInMinutes: null,
          isServiceAvailable: false,
        }}
      />,
    );

    fireEvent.press(getByTestId('transport-shuttle'));

    expect(getByTestId('shuttle-unavailable-text').props.children).toBe(
      'Shuttle bus unavailable today. Try Public Transit.',
    );
  });

  test('pan-responder release swaps and suppresses immediate follow-up press', () => {
    const onSwapLocations = jest.fn();
    let panResponderConfig: any;
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config: any) => {
        panResponderConfig = config;
        return { panHandlers: {} } as any;
      });
    const { getByTestId } = render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        onSwapLocations={onSwapLocations}
      />,
    );

    expect(panResponderConfig.onStartShouldSetPanResponder()).toBe(false);
    expect(panResponderConfig.onMoveShouldSetPanResponder({}, { dx: 1, dy: 8 })).toBe(true);
    expect(panResponderConfig.onMoveShouldSetPanResponder({}, { dx: 9, dy: 8 })).toBe(false);

    act(() => {
      panResponderConfig.onPanResponderGrant({}, { dx: 0, dy: 0 });
      panResponderConfig.onPanResponderRelease({}, { dx: 0, dy: 10 });
    });
    expect(onSwapLocations).toHaveBeenCalledTimes(0);

    act(() => {
      panResponderConfig.onPanResponderGrant({}, { dx: 0, dy: 0 });
      panResponderConfig.onPanResponderRelease({}, { dx: 0, dy: 20 });
    });

    expect(onSwapLocations).toHaveBeenCalledTimes(1);

    const dragHandle = getByTestId('destination-location-drag-handle');
    fireEvent.press(dragHandle);
    expect(onSwapLocations).toHaveBeenCalledTimes(1);

    fireEvent.press(dragHandle);
    expect(onSwapLocations).toHaveBeenCalledTimes(2);
    panResponderCreateSpy.mockRestore();
  });

  test('pan-responder terminate above threshold swaps locations', () => {
    const onSwapLocations = jest.fn();
    let panResponderConfig: any;
    const panResponderCreateSpy = jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config: any) => {
        panResponderConfig = config;
        return { panHandlers: {} } as any;
      });
    render(
      <DirectionDetails
        startBuilding={mockBuildings[0]}
        destinationBuilding={mockBuildings[1]}
        onClose={jest.fn()}
        userLocation={null}
        currentBuilding={null}
        onSwapLocations={onSwapLocations}
      />,
    );

    act(() => {
      panResponderConfig.onPanResponderGrant({}, { dx: 0, dy: 0 });
      panResponderConfig.onPanResponderTerminate({}, { dx: 0, dy: 10 });
    });
    expect(onSwapLocations).toHaveBeenCalledTimes(0);

    act(() => {
      panResponderConfig.onPanResponderGrant({}, { dx: 0, dy: 0 });
      panResponderConfig.onPanResponderTerminate({}, { dx: 0, dy: 18 });
    });

    expect(onSwapLocations).toHaveBeenCalledTimes(1);
    panResponderCreateSpy.mockRestore();
  });
});
