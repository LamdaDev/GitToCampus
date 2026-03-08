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

  test('calls onPressEvent when an event row is tapped', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const onPressEvent = jest.fn(async () => null);
    const { findByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} onPressEvent={onPressEvent} />,
    );

    const firstEvent = await findByTestId('upcoming-class-event-event-1');
    fireEvent.press(firstEvent);

    await waitFor(() => expect(onPressEvent).toHaveBeenCalledWith(mockEvents[0]));
  });

  test('shows event action error when onPressEvent returns a message', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const { findByTestId } = render(
      <UpcomingClassesSlider
        selectedCalendarIds={['calendar-1']}
        onPressEvent={async () => 'Could not resolve class location.'}
      />,
    );

    fireEvent.press(await findByTestId('upcoming-class-event-event-1'));
    expect(await findByTestId('upcoming-classes-action-error')).toHaveTextContent(
      'Could not resolve class location.',
    );
  });

  test('renders next class summary card with title/time/location', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const { findByTestId, getByText, getAllByText } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />,
    );

    expect(await findByTestId('next-class-summary-card')).toBeTruthy();
    expect(getByText('Next Class')).toBeTruthy();
    expect(getAllByText('User Interface').length).toBeGreaterThan(0);
    expect(getAllByText('Hall Building 455').length).toBeGreaterThan(0);
  });

  test('shows urgency indicator when next class starts within 10 minutes', async () => {
    const urgentEvent = {
      id: 'event-urgent',
      calendarId: 'calendar-1',
      title: 'Urgent Class',
      location: 'Hall H-110',
      startsAt: Date.now() + 8 * 60 * 1000,
    };
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [urgentEvent],
    });

    const { findByText } = render(<UpcomingClassesSlider selectedCalendarIds={['calendar-1']} />);
    expect(await findByText('Starts in 8 min')).toBeTruthy();
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

  test('shows loading state when generating route for selected class', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    let resolvePress: (value: string | null) => void = () => undefined;
    const onPressEvent = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          resolvePress = resolve;
        }),
    );

    const { findByTestId, queryByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} onPressEvent={onPressEvent} />,
    );

    fireEvent.press(await findByTestId('upcoming-class-event-event-1'));
    expect(await findByTestId('upcoming-classes-route-loading')).toBeTruthy();

    await act(async () => {
      resolvePress(null);
    });
    await waitFor(() => expect(queryByTestId('upcoming-classes-route-loading')).toBeNull());
  });

  test('retry button retries failed route generation', async () => {
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: mockEvents,
    });

    const onPressEvent = jest
      .fn()
      .mockResolvedValueOnce('Could not generate route—try again')
      .mockResolvedValueOnce(null);

    const { findByTestId, getByTestId, queryByTestId } = render(
      <UpcomingClassesSlider selectedCalendarIds={['calendar-1']} onPressEvent={onPressEvent} />,
    );

    fireEvent.press(await findByTestId('upcoming-class-event-event-1'));
    expect(await findByTestId('upcoming-classes-action-error')).toHaveTextContent(
      'Could not generate route—try again',
    );

    fireEvent.press(getByTestId('retry-route-generation-button'));
    await waitFor(() => expect(onPressEvent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(queryByTestId('upcoming-classes-action-error')).toBeNull());
  });
});
