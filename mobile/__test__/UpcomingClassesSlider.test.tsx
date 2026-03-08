import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
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
  isGoogleCalendarEventActiveOrUpcoming: jest.fn(
    (
      event: {
        startsAt: number;
        endsAt?: number;
      },
      nowTimestamp: number,
    ) =>
      typeof event.endsAt === 'number'
        ? event.endsAt > nowTimestamp
        : event.startsAt >= nowTimestamp,
  ),
}));

describe('UpcomingClassesSlider', () => {
  jest.setTimeout(15_000);

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
    expect(getByTestId('upcoming-class-event-event-1')).toBeTruthy();
  });

  test('does not render next class summary card', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const { queryByTestId, queryByText } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledTimes(1));
    expect(queryByTestId('next-class-summary-card')).toBeNull();
    expect(queryByText('Next Class')).toBeNull();
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
    expect(await findByTestId('upcoming-classes-empty')).toHaveTextContent(
      /No upcoming or in-progress classes for .* Have a great day!/i,
    );
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

    const { findByTestId, queryAllByTestId, getByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    expect(await findByTestId('upcoming-class-event-event-1')).toBeTruthy();
    expect(queryAllByTestId(/^upcoming-class-event-event-/)).toHaveLength(12);
    expect(getByTestId('upcoming-classes-overflow-indicator')).toHaveTextContent('...');
  });

  test('hides an in-progress class after its end time passes', async () => {
    jest.useFakeTimers();
    const baseNow = new Date('2026-09-14T10:30:00.000Z');
    jest.setSystemTime(baseNow);

    try {
      const inProgressClass = {
        id: 'event-in-progress',
        calendarId: 'calendar-1',
        title: 'SOEN 321 LEC',
        location: 'Hall H-110',
        startsAt: new Date('2026-09-14T10:00:00.000Z').getTime(),
        endsAt: new Date('2026-09-14T10:31:00.000Z').getTime(),
      };

      fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
        type: 'success',
        events: [inProgressClass],
      });

      const { findByTestId, queryByTestId } = render(
        <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
      );

      expect(await findByTestId('upcoming-class-event-event-in-progress')).toBeTruthy();

      act(() => {
        jest.setSystemTime(new Date('2026-09-14T10:32:00.000Z'));
        jest.advanceTimersByTime(120_000);
      });

      await waitFor(() => {
        expect(queryByTestId('upcoming-class-event-event-in-progress')).toBeNull();
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
