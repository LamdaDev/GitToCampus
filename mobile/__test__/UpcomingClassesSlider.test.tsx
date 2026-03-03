import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import UpcomingClassesSlider from '../src/components/UpcomingClassesSlider';
import * as googleCalendarAuth from '../src/services/googleCalendarAuth';

const mockEvents = [
  {
    id: 'event-1',
    calendarId: 'calendar-1',
    title: 'User Interface',
    location: 'Hall Building 455',
    startsAt: new Date('2030-02-19T12:00:00.000Z').getTime(),
  },
  {
    id: 'event-2',
    calendarId: 'calendar-2',
    title: 'Data Structures',
    location: 'Faubourg Building C080',
    startsAt: new Date('2030-02-19T13:00:00.000Z').getTime(),
  },
];

const manyMockEvents = Array.from({ length: 13 }, (_value, index) => ({
  id: `event-${index + 1}`,
  calendarId: 'calendar-1',
  title: `Event ${index + 1}`,
  location: `Location ${index + 1}`,
  startsAt: new Date(
    `2030-02-19T${String((index % 12) + 1).padStart(2, '0')}:00:00.000Z`,
  ).getTime(),
}));

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const { FlatList } = require('react-native');
  return {
    BottomSheetFlatList: (props: React.ComponentProps<typeof FlatList>) => <FlatList {...props} />,
  };
});

jest.mock('../src/services/googleCalendarAuth', () => ({
  fetchGoogleCalendarEventsAsync: jest.fn(async () => ({
    type: 'success',
    events: [],
  })),
}));

describe('UpcomingClassesSlider', () => {
  const fetchGoogleCalendarEventsMock =
    googleCalendarAuth.fetchGoogleCalendarEventsAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchGoogleCalendarEventsMock.mockResolvedValue({
      type: 'success',
      events: [],
    });
  });

  test('loads and renders upcoming class events', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const { getByTestId, findByTestId, getByText } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1', 'calendar-2']} />,
    );

    expect(getByTestId('upcoming-classes-slider')).toBeTruthy();
    expect(getByTestId('upcoming-classes-datetime')).toBeTruthy();
    expect(getByText('Upcoming Classes:')).toBeTruthy();
    expect(await findByTestId('upcoming-class-event-event-1')).toBeTruthy();
    expect(getByText('User Interface')).toBeTruthy();
    expect(getByText('Hall Building 455')).toBeTruthy();
  });

  test('shows error and retries loading upcoming classes', async () => {
    fetchGoogleCalendarEventsMock
      .mockResolvedValueOnce({
        type: 'error',
        message: 'Unable to load upcoming classes right now. Please retry.',
      })
      .mockResolvedValueOnce({
        type: 'success',
        events: mockEvents,
      });

    const { getByTestId, findByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    expect(await findByTestId('upcoming-classes-error')).toHaveTextContent(
      'Unable to load upcoming classes right now. Please retry.',
    );

    fireEvent.press(getByTestId('retry-upcoming-classes-button'));
    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledTimes(2));
    expect(getByTestId('upcoming-class-event-event-1')).toBeTruthy();
  });

  test('shows empty state when there are no upcoming classes', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [],
    });

    const { findByTestId } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);
    expect(await findByTestId('upcoming-classes-empty')).toBeTruthy();
  });

  test('calls onReselectCalendars when button is pressed', async () => {
    const onReselectCalendars = jest.fn();
    const { getByTestId } = render(
      <UpcomingClassesSlider
        selectedCalendarIds={['calendar-1']}
        onReselectCalendars={onReselectCalendars}
      />,
    );

    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('reselect-calendars-button'));
    expect(onReselectCalendars).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} onClose={onClose} />,
    );

    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('close-upcoming-classes-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows only top 12 events and overflow indicator when more events exist', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: manyMockEvents,
    });

    const { findByTestId, queryByTestId, getByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    expect(await findByTestId('upcoming-class-event-event-12')).toBeTruthy();
    expect(queryByTestId('upcoming-class-event-event-13')).toBeNull();
    expect(getByTestId('upcoming-classes-overflow-indicator')).toHaveTextContent('...');
  });
});
