import React from 'react';
import { act, render, fireEvent, waitFor } from '@testing-library/react-native';
import SearchSheet from '../src/components/SearchSheet';
import { Campus } from '../src/types/Campus';
import { BuildingShape } from '../src/types/BuildingShape';
import * as googleCalendarAuth from '../src/services/googleCalendarAuth';

const mockBuildings: BuildingShape[] = [
  {
    id: '1',
    name: 'Hall Building',
    address: '1455 De Maisonneuve',
    polygons: [],
    campus: 'SGW' as Campus,
  },
  {
    id: '2',
    name: 'Library Building',
    address: '1400 De Maisonneuve',
    polygons: [],
    campus: 'SGW' as Campus,
  },
  {
    id: '3',
    name: 'Loyola Chapel',
    address: '7141 Sherbrooke',
    polygons: [],
    campus: 'LOYOLA' as Campus,
  },
];

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('react-native-elements', () => {
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({
      onChangeText,
      value,
      placeholder,
    }: {
      onChangeText: (text: string) => void;
      value: string;
      placeholder: string;
    }) => (
      <TextInput
        testID="search-bar"
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
      />
    ),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const { FlatList, ScrollView } = require('react-native');
  return {
    BottomSheetFlatList: (props: React.ComponentProps<typeof FlatList>) => <FlatList {...props} />,
    BottomSheetScrollView: (props: React.ComponentProps<typeof ScrollView>) => (
      <ScrollView {...props} />
    ),
  };
});

jest.mock('../src/components/indoor/RoomList', () => {
  const { View, Text, TouchableOpacity } = require('react-native');

  return ({ search, onSelectRoom }: { search?: string; onSelectRoom?: (room: any) => void }) => (
    <View testID="mock-room-list">
      <Text testID="mock-room-search-value">{search ?? ''}</Text>
      <TouchableOpacity
        testID="mock-room-select-button"
        onPress={() =>
          onSelectRoom?.({
            id: 'room-h-811',
            label: 'H-811',
            floor: 8,
            buildingId: 'Hall',
            buildingKey: 'H',
            campus: 'SGW',
          })
        }
      >
        <Text>H-811</Text>
      </TouchableOpacity>
    </View>
  );
});

jest.mock('../src/services/googleCalendarAuth', () => ({
  connectGoogleCalendarAsync: jest.fn(async () => ({ type: 'cancel' })),
  fetchGoogleCalendarEventsAsync: jest.fn(async () => ({ type: 'success', events: [] })),
  getStoredGoogleCalendarSessionState: jest.fn(async () => ({
    status: 'not_connected',
    session: null,
  })),
  clearGoogleCalendarSession: jest.fn(async () => {}),
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

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((pendingResolve) => {
    resolve = pendingResolve;
  });

  return { promise, resolve };
};

describe('SearchSheet', () => {
  const getStoredSessionStateMock =
    googleCalendarAuth.getStoredGoogleCalendarSessionState as jest.Mock;
  const connectGoogleCalendarMock = googleCalendarAuth.connectGoogleCalendarAsync as jest.Mock;
  const fetchGoogleCalendarEventsMock =
    googleCalendarAuth.fetchGoogleCalendarEventsAsync as jest.Mock;
  const clearCalendarSessionMock = googleCalendarAuth.clearGoogleCalendarSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    getStoredSessionStateMock.mockResolvedValue({
      status: 'not_connected',
      session: null,
    });
    connectGoogleCalendarMock.mockResolvedValue({ type: 'cancel' });
    fetchGoogleCalendarEventsMock.mockResolvedValue({ type: 'success', events: [] });
    clearCalendarSessionMock.mockResolvedValue(undefined);
    jest.useRealTimers();
  });

  test('renders without crashing', () => {
    const { getByTestId } = render(<SearchSheet buildings={mockBuildings} />);
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('renders all buildings when search is empty', () => {
    const { getByText } = render(<SearchSheet buildings={mockBuildings} />);
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('Library Building')).toBeTruthy();
    expect(getByText('Loyola Chapel')).toBeTruthy();
  });

  test('filters buildings by name', () => {
    const { getByTestId, getByText, queryByText } = render(
      <SearchSheet buildings={mockBuildings} />,
    );
    fireEvent.changeText(getByTestId('search-bar'), 'hall');
    expect(getByText('Hall Building')).toBeTruthy();
    expect(queryByText('Library Building')).toBeNull();
    expect(queryByText('Loyola Chapel')).toBeNull();
  });

  test('filters buildings by address', () => {
    const { getByTestId, getByText, queryByText } = render(
      <SearchSheet buildings={mockBuildings} />,
    );
    fireEvent.changeText(getByTestId('search-bar'), 'Sherbrooke');
    expect(getByText('Loyola Chapel')).toBeTruthy();
    expect(queryByText('Hall Building')).toBeNull();
  });

  test('shows empty message when no buildings match', () => {
    const { getByTestId, getByText } = render(<SearchSheet buildings={mockBuildings} />);
    fireEvent.changeText(getByTestId('search-bar'), 'zzznomatch');
    expect(getByText('No buildings found')).toBeTruthy();
  });

  test('renders room results when search mode is rooms', () => {
    const { getByTestId, queryByText } = render(
      <SearchSheet buildings={mockBuildings} searchMode="rooms" />,
    );

    expect(getByTestId('mock-room-list')).toBeTruthy();
    expect(queryByText('Hall Building')).toBeNull();
  });

  test('renders both room and building sections when search mode is mixed', () => {
    const { getByTestId, getByText } = render(
      <SearchSheet buildings={mockBuildings} searchMode="mixed" />,
    );

    expect(getByTestId('mixed-search-results')).toBeTruthy();
    expect(getByTestId('search-section-rooms')).toBeTruthy();
    expect(getByTestId('search-section-buildings')).toBeTruthy();
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByTestId('mock-room-list')).toBeTruthy();
  });

  test('forwards room selection in mixed search mode', () => {
    const onSelectRoom = jest.fn();
    const { getByTestId } = render(
      <SearchSheet buildings={mockBuildings} searchMode="mixed" onSelectRoom={onSelectRoom} />,
    );

    fireEvent.press(getByTestId('mock-room-select-button'));

    expect(onSelectRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'room-h-811',
        buildingKey: 'H',
      }),
    );
  });

  test('calls onPressBuilding with correct building when pressed', () => {
    const onPressBuilding = jest.fn();
    const { getByText } = render(
      <SearchSheet buildings={mockBuildings} onPressBuilding={onPressBuilding} />,
    );
    fireEvent.press(getByText('Hall Building'));
    expect(onPressBuilding).toHaveBeenCalledWith(mockBuildings[0]);
  });

  test('shows connect button on initial load', async () => {
    const { getByTestId } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Connect Google Calendar',
      ),
    );
  });

  test('shows a clear denied-permission message when auth is denied', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({ type: 'denied' });
    const { getByTestId, findByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Connect Google Calendar',
      ),
    );
    fireEvent.press(getByTestId('connect-google-calendar-button'));

    await waitFor(() => expect(connectGoogleCalendarMock).toHaveBeenCalledTimes(1));

    expect(
      await findByText(
        'Calendar permission was denied. You can continue using the app and connect later.',
      ),
    ).toBeTruthy();
  });

  test('shows connected state after successful calendar sign-in', async () => {
    const onCalendarConnected = jest.fn();
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'success',
      session: {
        accessToken: 'token-1',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });
    const { getByTestId, queryByText } = render(
      <SearchSheet buildings={mockBuildings} onCalendarConnected={onCalendarConnected} />,
    );

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Connect Google Calendar',
      ),
    );
    fireEvent.press(getByTestId('connect-google-calendar-button'));

    await waitFor(() => expect(connectGoogleCalendarMock).toHaveBeenCalledTimes(1));

    expect(queryByText('Google Calendar connected.')).toBeNull();
    expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
      'Sign Out Google Calendar',
    );
    expect(onCalendarConnected).toHaveBeenCalledTimes(1);
  });

  test('shows next class card and calls GO action when connected with selected calendars', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'event-1',
          calendarId: 'calendar-1',
          title: 'Hall Building 435',
          location: 'Hall Building 435',
          startsAt: Date.now() + 30 * 60 * 1000,
        },
      ],
    });

    const onCalendarGoPress = jest.fn();
    const { getByTestId, getAllByText } = render(
      <SearchSheet
        buildings={mockBuildings}
        selectedCalendarIds={['calendar-1']}
        onCalendarGoPress={onCalendarGoPress}
      />,
    );

    await waitFor(() => expect(getByTestId('next-class-card')).toBeTruthy());
    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledWith(['calendar-1']));
    await waitFor(() => expect(getAllByText('Hall Building 435').length).toBeGreaterThan(0));

    fireEvent.press(getByTestId('next-class-go-button'));
    expect(onCalendarGoPress).toHaveBeenCalledTimes(1);
    expect(onCalendarGoPress).toHaveBeenCalledWith({
      id: 'event-1',
      calendarId: 'calendar-1',
      title: 'Hall Building 435',
      location: 'Hall Building 435',
      startsAt: expect.any(Number),
    });
  });

  test('ignores stale next class responses when selected calendars change quickly', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });

    const firstRequest = createDeferred<{
      type: 'success';
      events: {
        id: string;
        calendarId: string;
        title: string;
        location: string;
        startsAt: number;
      }[];
    }>();
    const secondRequest = createDeferred<{
      type: 'success';
      events: {
        id: string;
        calendarId: string;
        title: string;
        location: string;
        startsAt: number;
      }[];
    }>();

    fetchGoogleCalendarEventsMock
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise);

    const onCalendarGoPress = jest.fn();
    const { getByTestId, queryByText, rerender } = render(
      <SearchSheet
        buildings={mockBuildings}
        selectedCalendarIds={['calendar-1']}
        onCalendarGoPress={onCalendarGoPress}
      />,
    );

    await waitFor(() => expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledWith(['calendar-1']));

    rerender(
      <SearchSheet
        buildings={mockBuildings}
        selectedCalendarIds={['calendar-2']}
        onCalendarGoPress={onCalendarGoPress}
      />,
    );

    await waitFor(() =>
      expect(fetchGoogleCalendarEventsMock).toHaveBeenLastCalledWith(['calendar-2']),
    );

    await act(async () => {
      secondRequest.resolve({
        type: 'success',
        events: [
          {
            id: 'event-latest',
            calendarId: 'calendar-2',
            title: 'Second Response Class',
            location: 'Faubourg Building C080',
            startsAt: Date.now() + 15 * 60 * 1000,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(queryByText('Second Response Class')).toBeTruthy());

    await act(async () => {
      firstRequest.resolve({
        type: 'success',
        events: [
          {
            id: 'event-stale',
            calendarId: 'calendar-1',
            title: 'First Response Class',
            location: 'Hall Building 435',
            startsAt: Date.now() + 10 * 60 * 1000,
          },
        ],
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(queryByText('First Response Class')).toBeNull());

    fireEvent.press(getByTestId('next-class-go-button'));
    expect(onCalendarGoPress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-latest',
        calendarId: 'calendar-2',
        title: 'Second Response Class',
      }),
    );
  });

  test('filters unsupported locations and chooses the next supported class for GO', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'event-unsupported',
          calendarId: 'calendar-1',
          title: 'Dinner',
          location: 'Downtown Cafe',
          startsAt: Date.now() + 15 * 60 * 1000,
        },
        {
          id: 'event-supported',
          calendarId: 'calendar-1',
          title: 'SOEN 321',
          location: 'Hall Building 435',
          startsAt: Date.now() + 30 * 60 * 1000,
        },
      ],
    });

    const onCalendarGoPress = jest.fn();
    const { getByTestId, findByText } = render(
      <SearchSheet
        buildings={mockBuildings}
        selectedCalendarIds={['calendar-1']}
        onCalendarGoPress={onCalendarGoPress}
      />,
    );

    await waitFor(() => expect(getByTestId('next-class-card')).toBeTruthy());
    expect(await findByText('SOEN 321')).toBeTruthy();
    expect(await findByText('Hall Building 435')).toBeTruthy();

    fireEvent.press(getByTestId('next-class-go-button'));
    expect(onCalendarGoPress).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'event-supported',
        location: 'Hall Building 435',
      }),
    );
  });

  test('shows no upcoming classes in next class card when events are empty', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [],
    });

    const { findByText, getByTestId } = render(
      <SearchSheet buildings={mockBuildings} selectedCalendarIds={['calendar-1']} />,
    );

    await waitFor(() => expect(getByTestId('next-class-card')).toBeTruthy());
    expect(getByTestId('next-class-card')).toBeTruthy();
    expect(await findByText('No upcoming or in-progress classes')).toBeTruthy();
  });

  test('shows supported-location empty state when upcoming events are filtered out', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: [
        {
          id: 'event-unsupported',
          calendarId: 'calendar-1',
          title: 'Team Dinner',
          location: 'Downtown Cafe',
          startsAt: Date.now() + 30 * 60 * 1000,
        },
      ],
    });

    const { findByText, getByTestId } = render(
      <SearchSheet buildings={mockBuildings} selectedCalendarIds={['calendar-1']} />,
    );

    await waitFor(() => expect(getByTestId('next-class-card')).toBeTruthy());
    expect(await findByText('No upcoming classes with supported Concordia locations')).toBeTruthy();
  });

  test('shows calendar GO error message when provided by parent', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });

    const { getByTestId } = render(
      <SearchSheet
        buildings={mockBuildings}
        calendarGoErrorMessage="Unable to find route: Location Not Provided/Not Found"
      />,
    );

    await waitFor(() => expect(getByTestId('next-class-card')).toBeTruthy());
    expect(getByTestId('calendar-go-error-message')).toHaveTextContent(
      'Unable to find route: Location Not Provided/Not Found',
    );
  });

  test('shows expired helper and status when a stored session is already expired', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'expired',
      session: null,
    });

    const { getByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(
        getByText('Session expired. Reconnect Google Calendar to continue syncing.'),
      ).toBeTruthy(),
    );
  });

  test('marks connected sessions as expired immediately when token expiry has passed', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-expired',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() - 5,
      },
    });

    const { getByTestId, findByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() => expect(clearCalendarSessionMock).toHaveBeenCalledTimes(1));
    expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
      'Reconnect Google Calendar',
    );
    expect(
      await findByText('Session expired. Reconnect Google Calendar to continue syncing.'),
    ).toBeTruthy();
  });

  test('still marks session as expired if secure-store cleanup fails', async () => {
    clearCalendarSessionMock.mockRejectedValueOnce(new Error('secure store failed'));
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-expired',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() - 5,
      },
    });

    const { getByTestId, findByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Reconnect Google Calendar',
      ),
    );
    expect(
      await findByText('Session expired. Reconnect Google Calendar to continue syncing.'),
    ).toBeTruthy();
  });

  test('expires connected session when timeout elapses', async () => {
    jest.useFakeTimers();
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-future',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 20,
      },
    });

    const { getByTestId } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Sign Out Google Calendar',
      ),
    );

    await act(async () => {
      jest.advanceTimersByTime(40);
    });

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Reconnect Google Calendar',
      ),
    );
    expect(clearCalendarSessionMock).toHaveBeenCalledTimes(1);
  });

  test('signs out when calendar action button is pressed in connected state', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token-live',
        tokenType: 'Bearer',
        scope: 'https://www.googleapis.com/auth/calendar.readonly',
        expiresAt: Date.now() + 10 * 60 * 1000,
      },
    });

    const { getByTestId, findByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Sign Out Google Calendar',
      ),
    );
    expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
      'Sign Out Google Calendar',
    );

    fireEvent.press(getByTestId('connect-google-calendar-button'));

    await waitFor(() => expect(clearCalendarSessionMock).toHaveBeenCalledTimes(1));
    expect(await findByText('Signed out of Google Calendar.')).toBeTruthy();
    expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
      'Connect Google Calendar',
    );
    expect(connectGoogleCalendarMock).not.toHaveBeenCalled();
  });

  test('preserves expired status when reconnect fails with generic error', async () => {
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'expired',
      session: null,
    });
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Failed to refresh token.',
    });

    const { getByTestId, findByText } = render(<SearchSheet buildings={mockBuildings} />);

    await waitFor(() =>
      expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
        'Reconnect Google Calendar',
      ),
    );
    fireEvent.press(getByTestId('connect-google-calendar-button'));

    expect(await findByText('Failed to refresh token.')).toBeTruthy();
    expect(getByTestId('connect-google-calendar-button')).toHaveTextContent(
      'Reconnect Google Calendar',
    );
  });
});
