import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ScrollView, StyleSheet } from 'react-native';
import TransitPlanDetails from '../src/components/TransitPlanDetails';
import type { BuildingShape } from '../src/types/BuildingShape';
import type { TransitInstruction } from '../src/types/Directions';

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, color, size }: { name: string; color?: string; size?: number }) => (
      <Text testID={`icon-${name}`}>{`${name}-${color ?? ''}-${size ?? ''}`}</Text>
    ),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { ScrollView } = require('react-native');

  return {
    __esModule: true,
    BottomSheetScrollView: (props: React.ComponentProps<typeof ScrollView>) => (
      <ScrollView {...props} />
    ),
  };
});

const destinationBuilding: BuildingShape = {
  id: 'dest-building',
  campus: 'SGW',
  name: 'EV Building',
  polygons: [],
};

const createStep = (overrides: Partial<TransitInstruction>): TransitInstruction => ({
  id: 'step-id',
  type: 'transit',
  title: 'Board transit',
  ...overrides,
});

describe('TransitPlanDetails', () => {
  test('renders header and empty-state copy and handles back/close actions', () => {
    const onBack = jest.fn();
    const onClose = jest.fn();
    const { getByText, getByTestId } = render(
      <TransitPlanDetails
        destinationBuilding={destinationBuilding}
        routeTransitSteps={[]}
        onBack={onBack}
        onClose={onClose}
      />,
    );

    expect(getByText('Public Transit')).toBeTruthy();
    expect(getByText('EV Building')).toBeTruthy();
    expect(getByTestId('transit-empty-text')).toBeTruthy();
    expect(getByTestId('transit-plan-scroll').props.nestedScrollEnabled).toBe(true);
    expect(getByTestId('transit-plan-scroll').props.keyboardShouldPersistTaps).toBe('handled');
    expect(StyleSheet.flatten(getByTestId('transit-plan-scroll').props.style)).toMatchObject({
      flex: 1,
      width: '100%',
    });
    expect(
      StyleSheet.flatten(getByTestId('transit-plan-scroll').props.contentContainerStyle),
    ).toMatchObject({
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 96,
    });
    expect(getByTestId('icon-arrow-back')).toBeTruthy();
    expect(getByTestId('icon-close-sharp')).toBeTruthy();

    fireEvent.press(getByTestId('transit-back-button'));
    fireEvent.press(getByTestId('transit-close-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('uses a scrollable bottom-sheet-aware container for long transit itineraries', () => {
    const { UNSAFE_getByType } = render(
      <TransitPlanDetails
        destinationBuilding={destinationBuilding}
        routeTransitSteps={Array.from({ length: 12 }, (_, index) =>
          createStep({
            id: `long-step-${index}`,
            title: `Transit step ${index + 1}`,
          }),
        )}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(UNSAFE_getByType(ScrollView).props.nestedScrollEnabled).toBe(true);
  });

  test('renders transit badges with safe color fallback and route metadata text', () => {
    const routeTransitSteps: TransitInstruction[] = [
      createStep({
        id: 'badge-fallback',
        title: 'Board the 747 bus',
        subtitle: 'Toward Downtown',
        detail: 'Ride 8 stops, 21 mins',
        lineShortName: '747',
        lineColor: 'invalid-color',
        lineTextColor: '#12',
        departureStopName: 'Loyola',
        arrivalStopName: 'SGW',
        departureTimeText: '3:09 PM',
        arrivalTimeText: '3:31 PM',
      }),
      createStep({
        id: 'badge-valid',
        title: 'Board the 1 metro',
        lineShortName: '1',
        lineColor: '#00985F',
        lineTextColor: '#FFFFFF',
        departureStopName: 'Only Departure',
      }),
      createStep({
        id: 'badge-arrival-only',
        title: 'Board shuttle',
        lineShortName: 'S',
        lineColor: '#1A1A1A',
        lineTextColor: '#abc',
        arrivalStopName: 'Only Arrival',
      }),
    ];

    const { getByTestId, getByText } = render(
      <TransitPlanDetails
        destinationBuilding={destinationBuilding}
        routeTransitSteps={routeTransitSteps}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId('transit-step-0')).toBeTruthy();
    expect(getByTestId('transit-step-1')).toBeTruthy();
    expect(getByTestId('transit-step-2')).toBeTruthy();

    const fallbackBadgeText = getByText('747');
    expect(fallbackBadgeText).toHaveStyle({ color: '#FFFFFF' });

    const validBadgeText = getByText('1');
    expect(validBadgeText).toHaveStyle({ color: '#FFFFFF' });

    const shortHexBadgeText = getByText('S');
    expect(shortHexBadgeText).toHaveStyle({ color: '#abc' });

    expect(getByText('Toward Downtown')).toBeTruthy();
    expect(getByText('Ride 8 stops, 21 mins')).toBeTruthy();
    expect(getByText('Loyola -> SGW')).toBeTruthy();
    expect(getByText('Only Departure')).toBeTruthy();
    expect(getByText('Only Arrival')).toBeTruthy();
    expect(getByText('Departs 3:09 PM')).toBeTruthy();
    expect(getByText('Arrives 3:31 PM')).toBeTruthy();
  });

  test('renders icon badges for walking, subway, rail and default bus cases', () => {
    const routeTransitSteps: TransitInstruction[] = [
      createStep({
        id: 'walk-step',
        type: 'walk',
        title: 'Walk to stop',
      }),
      createStep({
        id: 'subway-step',
        title: 'Board metro',
        vehicleType: 'SUBWAY',
      }),
      createStep({
        id: 'tram-step',
        title: 'Board tram',
        vehicleType: 'TRAM',
      }),
      createStep({
        id: 'default-step',
        title: 'Board vehicle',
        vehicleType: 'FERRY',
      }),
    ];

    const { getByTestId, queryByText, queryByTestId } = render(
      <TransitPlanDetails
        destinationBuilding={null}
        routeTransitSteps={routeTransitSteps}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(queryByText('EV Building')).toBeNull();
    expect(queryByTestId('transit-empty-text')).toBeNull();

    expect(getByTestId('icon-walk-outline')).toBeTruthy();
    expect(getByTestId('icon-subway-outline')).toBeTruthy();
    expect(getByTestId('icon-train-outline')).toBeTruthy();
    expect(getByTestId('icon-bus-outline')).toBeTruthy();
  });

  test('renders departure-only and arrival-only time rows and metro rail icon mapping', () => {
    const routeTransitSteps: TransitInstruction[] = [
      createStep({
        id: 'departure-only-step',
        title: 'Board metro',
        vehicleType: 'METRO_RAIL',
        departureTimeText: '10:05 AM',
      }),
      createStep({
        id: 'arrival-only-step',
        title: 'Arrive downtown',
        vehicleType: 'HEAVY_RAIL',
        arrivalTimeText: '10:27 AM',
      }),
      createStep({
        id: 'fallback-bus-step',
        title: 'Board fallback bus',
      }),
    ];

    const { getByText, queryByText, getAllByTestId } = render(
      <TransitPlanDetails
        destinationBuilding={destinationBuilding}
        routeTransitSteps={routeTransitSteps}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getAllByTestId('icon-subway-outline')).toHaveLength(2);
    expect(getAllByTestId('icon-bus-outline')).toHaveLength(1);
    expect(getByText('Departs 10:05 AM')).toBeTruthy();
    expect(getByText('Arrives 10:27 AM')).toBeTruthy();
    expect(queryByText('Arrives 10:05 AM')).toBeNull();
    expect(queryByText('Departs 10:27 AM')).toBeNull();
  });
});
