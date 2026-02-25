import React from 'react';
import { fireEvent, render, within } from '@testing-library/react-native';

import ShuttleScheduleDetails from '../src/components/ShuttleScheduleDetails';
import type { BuildingShape } from '../src/types/BuildingShape';

jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: (props: any) => <span {...props} />,
  };
});

const loyolaBuilding: BuildingShape = {
  polygons: [],
  id: 'loy-1',
  campus: 'LOYOLA',
  name: 'Physical Services Building',
  address: '7141 Sherbrooke O',
};

const sgwBuilding: BuildingShape = {
  polygons: [],
  id: 'sgw-1',
  campus: 'SGW',
  name: 'Grey Nuns Building',
  address: '1190 Guy St',
};

describe('ShuttleScheduleDetails', () => {
  test('renders next departures and full schedule when service is available', () => {
    const { getByTestId, getByText } = render(
      <ShuttleScheduleDetails
        startBuilding={sgwBuilding}
        destinationBuilding={loyolaBuilding}
        shuttlePlan={{
          direction: 'SGW_TO_LOYOLA',
          pickup: null,
          dropoff: null,
          nextDepartures: ['9:30 AM', '9:45 AM', '10:00 AM'],
          nextDepartureDates: [],
          nextDepartureInMinutes: 12,
          isServiceAvailable: true,
        }}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId('shuttle-schedule-details')).toBeTruthy();
    expect(getByTestId('shuttle-schedule-next-bus-text').props.children).toBe(
      'Next bus in 12 mins',
    );
    expect(getByText('Next departures: 9:30 AM, 9:45 AM, 10:00 AM')).toBeTruthy();
    expect(getByText('Monday - Thursday')).toBeTruthy();
    expect(getByText('Friday')).toBeTruthy();
    expect(getByTestId('shuttle-schedule-mon-thu-text')).toBeTruthy();
    expect(getByTestId('shuttle-schedule-friday-text')).toBeTruthy();
  });

  test('calls back and close handlers', () => {
    const onBack = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = render(
      <ShuttleScheduleDetails
        startBuilding={sgwBuilding}
        destinationBuilding={loyolaBuilding}
        shuttlePlan={null}
        onBack={onBack}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId('shuttle-schedule-back-button'));
    fireEvent.press(getByTestId('shuttle-schedule-close-button'));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows unavailable message when service is not available', () => {
    const { getByTestId } = render(
      <ShuttleScheduleDetails
        startBuilding={loyolaBuilding}
        destinationBuilding={sgwBuilding}
        shuttlePlan={{
          direction: 'LOYOLA_TO_SGW',
          pickup: null,
          dropoff: null,
          nextDepartures: [],
          nextDepartureDates: [],
          nextDepartureInMinutes: null,
          isServiceAvailable: false,
          message: 'Shuttle bus unavailable today. Try Public Transit.',
        }}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId('shuttle-schedule-unavailable-text').props.children).toBe(
      'Shuttle bus unavailable today. Try Public Transit.',
    );
  });

  test('highlights nearest departure chip for the active day bucket', () => {
    const { getByTestId } = render(
      <ShuttleScheduleDetails
        startBuilding={sgwBuilding}
        destinationBuilding={loyolaBuilding}
        shuttlePlan={{
          direction: 'SGW_TO_LOYOLA',
          pickup: null,
          dropoff: null,
          nextDepartures: ['9:45 AM', '10:00 AM', '10:15 AM'],
          nextDepartureDates: [new Date(2026, 1, 23, 9, 45, 0, 0)],
          nextDepartureInMinutes: 12,
          isServiceAvailable: true,
        }}
        onBack={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const nearestChip = getByTestId('shuttle-nearest-time-chip');
    expect(within(nearestChip).getByText('9:45')).toBeTruthy();
  });
});
