import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { act } from 'react-test-renderer';
import UpcomingClassesSlider from '../src/components/UpcomingClassesSlider';
import * as calendarAccess from '../src/services/calendarAccess';
import * as calendarRouteLocation from '../src/utils/calendarRouteLocation';

const mockEvents = [
  {
    id: 'event-1',
    calendarId: 'calendar-1',
    title: 'User Interface',
    location: 'Hall Building 455',
    startsAt: new Date(2030, 1, 19, 10, 0, 0).getTime(),
    endsAt: new Date(2030, 1, 19, 13, 0, 0).getTime(),
  },
  {
    id: 'event-2',
    calendarId: 'calendar-2',
    title: 'Data Structures',
    location: 'Faubourg Building C080',
    startsAt: new Date(2030, 1, 19, 14, 0, 0).getTime(),
    endsAt: new Date(2030, 1, 19, 15, 15, 0).getTime(),
  },
];

const manyMockEvents = Array.from({ length: 13 }, (_value, index) => ({
  id: `event-${index + 1}`,
  calendarId: 'calendar-1',
  title: `Event ${index + 1}`,
  location: `H ${100 + index}`,
  startsAt: new Date(2030, 1, 19, (index % 12) + 1, 0, 0).getTime(),
  endsAt: new Date(2030, 1, 19, (index % 12) + 2, 15, 0).getTime(),
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

jest.mock('../src/services/calendarAccess', () => ({
  fetchCalendarEventsAsync: jest.fn(async () => ({
    type: 'success',
    events: [],
  })),
}));

describe('UpcomingClassesSlider', () => {
  jest.setTimeout(15_000);

  const fetchCalendarEventsMock = calendarAccess.fetchCalendarEventsAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchCalendarEventsMock.mockResolvedValue({
      type: 'success',
      events: [],
    });
  });

  test('loads and renders upcoming class events', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
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
    expect(getByTestId('upcoming-class-event-datetime-event-1')).toHaveTextContent(
      'Tue, Feb 19 10:00 - 13:00',
    );
  });

  test('includes the end date when an event crosses into the next day', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'overnight-event',
          calendarId: 'calendar-1',
          title: 'Late Lab',
          location: 'Hall Building 455',
          startsAt: new Date(2030, 1, 19, 23, 0, 0).getTime(),
          endsAt: new Date(2030, 1, 20, 1, 0, 0).getTime(),
        },
      ],
    });

    const { findByTestId } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);

    expect(await findByTestId('upcoming-class-event-datetime-overnight-event')).toHaveTextContent(
      'Tue, Feb 19 23:00 - Wed, Feb 20 01:00',
    );
  });

  test('filters out upcoming events without supported Concordia locations', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'valid-event',
          calendarId: 'calendar-1',
          title: 'SOEN 321',
          location: 'Hall Building 455',
          startsAt: new Date(2030, 1, 19, 12, 0, 0).getTime(),
          endsAt: new Date(2030, 1, 19, 13, 15, 0).getTime(),
        },
        {
          id: 'invalid-event',
          calendarId: 'calendar-1',
          title: 'Personal Errand',
          location: 'Downtown Cafe',
          startsAt: new Date(2030, 1, 19, 13, 0, 0).getTime(),
          endsAt: new Date(2030, 1, 19, 14, 0, 0).getTime(),
        },
      ],
    });

    const { findByTestId, queryByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    expect(await findByTestId('upcoming-class-event-valid-event')).toBeTruthy();
    expect(queryByTestId('upcoming-class-event-invalid-event')).toBeNull();
  });

  test('reuses supported-location parsing across clock refresh ticks', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2030, 1, 19, 9, 0, 0));
    const parserSpy = jest.spyOn(calendarRouteLocation, 'isSupportedCalendarEventLocation');

    try {
      fetchCalendarEventsMock.mockResolvedValueOnce({
        type: 'success',
        events: mockEvents,
      });

      const { findByTestId } = render(
        <UpcomingClassesSlider selectedCalendarIds={['calendar-1', 'calendar-2']} />,
      );

      expect(await findByTestId('upcoming-class-event-event-1')).toBeTruthy();
      await waitFor(() => expect(parserSpy).toHaveBeenCalledTimes(mockEvents.length));

      act(() => {
        jest.setSystemTime(new Date(2030, 1, 19, 9, 0, 30));
        jest.advanceTimersByTime(30_000);
      });

      await waitFor(() => expect(parserSpy).toHaveBeenCalledTimes(mockEvents.length));
    } finally {
      parserSpy.mockRestore();
      jest.useRealTimers();
    }
  });

  test('does not render next class summary card', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const { queryByTestId, queryByText } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    await waitFor(() => expect(fetchCalendarEventsMock).toHaveBeenCalledTimes(1));
    expect(queryByTestId('next-class-summary-card')).toBeNull();
    expect(queryByText('Next Class')).toBeNull();
  });

  test('shows error and retries loading upcoming classes', async () => {
    fetchCalendarEventsMock
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
    await waitFor(() => expect(fetchCalendarEventsMock).toHaveBeenCalledTimes(2));
    expect(getByTestId('upcoming-class-event-event-1')).toBeTruthy();
  });

  test('shows empty state when there are no upcoming classes', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [],
    });

    const { findByTestId } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);
    expect(await findByTestId('upcoming-classes-empty')).toHaveTextContent(
      /No upcoming or in-progress classes for .* Have a great day!/i,
    );
  });

  test('shows supported-location empty state when upcoming events are filtered out', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'event-invalid-location',
          calendarId: 'calendar-1',
          title: 'Team Dinner',
          location: 'Downtown Cafe',
          startsAt: new Date(2030, 1, 19, 12, 0, 0).getTime(),
          endsAt: new Date(2030, 1, 19, 13, 0, 0).getTime(),
        },
      ],
    });

    const { findByTestId } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);
    expect(await findByTestId('upcoming-classes-empty')).toHaveTextContent(
      /No upcoming classes with supported Concordia locations/i,
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

    await waitFor(() => expect(fetchCalendarEventsMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('reselect-calendars-button'));
    expect(onReselectCalendars).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} onClose={onClose} />,
    );

    await waitFor(() => expect(fetchCalendarEventsMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('close-upcoming-classes-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows only top 12 events and overflow indicator when more events exist', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
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
    const baseNow = new Date(2026, 8, 14, 10, 30, 0);
    jest.setSystemTime(baseNow);

    try {
      const inProgressClass = {
        id: 'event-in-progress',
        calendarId: 'calendar-1',
        title: 'SOEN 321 LEC',
        location: 'Hall H-110',
        startsAt: new Date(2026, 8, 14, 10, 0, 0).getTime(),
        endsAt: new Date(2026, 8, 14, 10, 31, 0).getTime(),
      };

      fetchCalendarEventsMock.mockResolvedValueOnce({
        type: 'success',
        events: [inProgressClass],
      });

      const { findByTestId, queryByTestId } = render(
        <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
      );

      expect(await findByTestId('upcoming-class-event-event-in-progress')).toBeTruthy();

      act(() => {
        jest.setSystemTime(new Date(2026, 8, 14, 10, 32, 0));
        jest.advanceTimersByTime(120_000);
      });

      await waitFor(() => {
        expect(queryByTestId('upcoming-class-event-event-in-progress')).toBeNull();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  test('shows only the start time when an event end time is unavailable', async () => {
    fetchCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'event-no-end',
          calendarId: 'calendar-1',
          title: 'Seminar',
          location: 'H 810',
          startsAt: new Date(2030, 1, 19, 16, 0, 0).getTime(),
        },
      ],
    });

    const { findByTestId } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);

    expect(await findByTestId('upcoming-class-event-datetime-event-no-end')).toHaveTextContent(
      'Tue, Feb 19 16:00',
    );
  });
});
