import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as googleCalendarAuth from '../src/services/googleCalendarAuth';
import {
  clearCalendarConnectionAsync,
  connectCalendarAsync,
  fetchCalendarEventsAsync,
  fetchCalendarListAsync,
  getCalendarConnectionStateAsync,
} from '../src/services/calendarAccess';

const DEVICE_CALENDAR_ENABLED_STORAGE_KEY = 'gittocampus.deviceCalendar.enabled.v1';
const DEVICE_CALENDAR_FALLBACK_MESSAGE =
  'Using device calendars instead. If your Google account syncs to this device, its events should appear here.';

jest.mock('../src/services/googleCalendarAuth', () => ({
  connectGoogleCalendarAsync: jest.fn(async () => ({ type: 'cancel' })),
  fetchGoogleCalendarEventsAsync: jest.fn(async () => ({ type: 'success', events: [] })),
  fetchGoogleCalendarListAsync: jest.fn(async () => ({ type: 'success', calendars: [] })),
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

const createGoogleSession = () => ({
  accessToken: 'token-1',
  tokenType: 'Bearer',
  scope: 'scope-1',
  expiresAt: Date.now() + 60_000,
});

describe('calendarAccess', () => {
  const getStoredSessionStateMock =
    googleCalendarAuth.getStoredGoogleCalendarSessionState as jest.Mock;
  const connectGoogleCalendarMock = googleCalendarAuth.connectGoogleCalendarAsync as jest.Mock;
  const fetchGoogleCalendarEventsMock =
    googleCalendarAuth.fetchGoogleCalendarEventsAsync as jest.Mock;
  const fetchGoogleCalendarListMock = googleCalendarAuth.fetchGoogleCalendarListAsync as jest.Mock;
  const clearGoogleCalendarSessionMock = googleCalendarAuth.clearGoogleCalendarSession as jest.Mock;
  const getCalendarPermissionsMock = Calendar.getCalendarPermissionsAsync as jest.Mock;
  const requestCalendarPermissionsMock = Calendar.requestCalendarPermissionsAsync as jest.Mock;
  const getCalendarsMock = Calendar.getCalendarsAsync as jest.Mock;
  const getEventsMock = Calendar.getEventsAsync as jest.Mock;
  const getItemMock = AsyncStorage.getItem as jest.Mock;
  const removeItemMock = AsyncStorage.removeItem as jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useRealTimers();
    await AsyncStorage.clear();

    getStoredSessionStateMock.mockResolvedValue({
      status: 'not_connected',
      session: null,
    });
    connectGoogleCalendarMock.mockResolvedValue({
      type: 'cancel',
    });
    fetchGoogleCalendarEventsMock.mockResolvedValue({
      type: 'success',
      events: [],
    });
    fetchGoogleCalendarListMock.mockResolvedValue({
      type: 'success',
      calendars: [],
    });
    clearGoogleCalendarSessionMock.mockResolvedValue(undefined);
    getCalendarPermissionsMock.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    });
    requestCalendarPermissionsMock.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
    });
    getCalendarsMock.mockResolvedValue([]);
    getEventsMock.mockResolvedValue([]);
  });

  test('returns connected google state when a valid Google session exists', async () => {
    const session = createGoogleSession();
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session,
    });

    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'connected',
      source: 'google',
      session,
    });
  });

  test('returns the google-derived disconnected state when no fallback is enabled', async () => {
    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'not_connected',
      source: null,
      session: null,
    });
  });

  test('returns the google-derived disconnected state when fallback flag lookup fails', async () => {
    getItemMock.mockRejectedValueOnce(new Error('storage read failed'));

    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'not_connected',
      source: null,
      session: null,
    });
  });

  test('clears the device fallback flag when calendar permission is no longer granted', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarPermissionsMock.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
    });

    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'not_connected',
      source: null,
      session: null,
    });
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBeNull();
  });

  test('falls back to the google-derived state when permission lookup and cleanup both fail', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarPermissionsMock.mockRejectedValueOnce(new Error('permission lookup failed'));
    removeItemMock.mockRejectedValueOnce(new Error('cleanup failed'));

    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'not_connected',
      source: null,
      session: null,
    });
  });

  test('returns Google success and clears the device flag when Google auth succeeds', async () => {
    const session = createGoogleSession();
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'success',
      session,
    });

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'success',
      source: 'google',
      session,
    });
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBeNull();
  });

  test('still returns Google success when clearing the device flag fails', async () => {
    const session = createGoogleSession();
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'success',
      session,
    });
    removeItemMock.mockRejectedValueOnce(new Error('remove failed'));

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'success',
      source: 'google',
      session,
    });
  });

  test('passes through Google cancel responses unchanged', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({ type: 'cancel' });

    await expect(connectCalendarAsync()).resolves.toEqual({ type: 'cancel' });
  });

  test('passes through Google denied responses unchanged', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'denied',
      message: 'Access denied by Google.',
    });

    await expect(connectCalendarAsync()).resolves.toEqual({
      type: 'denied',
      message: 'Access denied by Google.',
    });
  });

  test('falls back to device calendar access when Google auth fails', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Google Calendar sign-in is not supported here.',
    });

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'success',
      source: 'device',
      session: null,
      message: `Google Calendar sign-in is not supported here. ${DEVICE_CALENDAR_FALLBACK_MESSAGE}`,
    });
    expect(requestCalendarPermissionsMock).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBe('true');
  });

  test('returns a combined error when device permission is denied after Google auth fails', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Google auth exploded.',
    });
    requestCalendarPermissionsMock.mockResolvedValueOnce({
      status: 'denied',
      granted: false,
      canAskAgain: true,
    });

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Google auth exploded. Device calendar permission was denied.',
    });
  });

  test('returns the thrown device permission error after Google auth fails', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Google auth exploded.',
    });
    requestCalendarPermissionsMock.mockRejectedValueOnce(new Error('device permission crashed'));

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Google auth exploded. device permission crashed',
    });
  });

  test('returns the default device permission error when a non-Error is thrown', async () => {
    connectGoogleCalendarMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Google auth exploded.',
    });
    requestCalendarPermissionsMock.mockRejectedValueOnce('permission rejected');

    const result = await connectCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message:
        'Google auth exploded. Unable to enable device calendar access right now. Please try again.',
    });
  });

  test('clears only the device fallback flag when disconnecting the device source', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    await clearCalendarConnectionAsync('device');

    expect(clearGoogleCalendarSessionMock).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBeNull();
  });

  test('clears only the Google session when disconnecting the Google source', async () => {
    await clearCalendarConnectionAsync('google');

    expect(clearGoogleCalendarSessionMock).toHaveBeenCalledTimes(1);
    expect(removeItemMock).not.toHaveBeenCalled();
  });

  test('clears both sources when no specific source is provided', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    await clearCalendarConnectionAsync(null);

    expect(clearGoogleCalendarSessionMock).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBeNull();
  });

  test('returns an error when calendar list is requested without an active source', async () => {
    const result = await fetchCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message:
        'Connect Google Calendar or enable device calendar access before loading your calendars.',
    });
  });

  test('delegates calendar list loading to Google when Google is connected', async () => {
    const googleCalendars = [
      { id: 'google-1', name: 'Google', accessRole: 'owner', isPrimary: true },
    ];
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: createGoogleSession(),
    });
    fetchGoogleCalendarListMock.mockResolvedValueOnce({
      type: 'success',
      calendars: googleCalendars,
    });

    const result = await fetchCalendarListAsync();

    expect(fetchGoogleCalendarListMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      type: 'success',
      calendars: googleCalendars,
    });
  });

  test('loads device calendars, filters invalid entries, and sorts primary calendars first', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarsMock.mockResolvedValueOnce([
      {
        id: 'device-shared',
        title: 'School',
        allowsModifications: false,
        isPrimary: false,
      },
      {
        id: 'device-primary',
        title: 'Personal',
        allowsModifications: true,
        isPrimary: true,
      },
      {
        id: 'invalid-calendar',
        title: '   ',
        allowsModifications: true,
        isPrimary: false,
      },
    ]);

    const result = await fetchCalendarListAsync();

    expect(result).toEqual({
      type: 'success',
      calendars: [
        {
          id: 'device-primary',
          name: 'Personal',
          accessRole: 'owner',
          isPrimary: true,
        },
        {
          id: 'device-shared',
          name: 'School',
          accessRole: 'reader',
          isPrimary: false,
        },
      ],
    });
  });

  test('returns the thrown device calendar list error message', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarsMock.mockRejectedValueOnce(new Error('calendar list exploded'));

    const result = await fetchCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'calendar list exploded',
    });
  });

  test('returns the default device calendar list error message for non-Error failures', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarsMock.mockRejectedValueOnce('calendar list failed');

    const result = await fetchCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Unable to load calendar list right now. Please retry.',
    });
  });

  test('returns empty events immediately when no calendar ids are provided', async () => {
    const result = await fetchCalendarEventsAsync([]);

    expect(result).toEqual({
      type: 'success',
      events: [],
    });
  });

  test('returns an error when upcoming classes are requested without an active source', async () => {
    const result = await fetchCalendarEventsAsync(['calendar-1']);

    expect(result).toEqual({
      type: 'error',
      message:
        'Connect Google Calendar or enable device calendar access before loading your upcoming classes.',
    });
  });

  test('delegates upcoming classes loading to Google with normalized calendar ids', async () => {
    const googleEvents = [
      {
        id: 'google-event-1',
        calendarId: 'calendar-1',
        title: 'Google Class',
        location: 'Hall Building 435',
        startsAt: Date.now() + 60_000,
      },
    ];
    getStoredSessionStateMock.mockResolvedValueOnce({
      status: 'connected',
      session: createGoogleSession(),
    });
    fetchGoogleCalendarEventsMock.mockResolvedValueOnce({
      type: 'success',
      events: googleEvents,
    });

    const result = await fetchCalendarEventsAsync([' calendar-1 ', 'calendar-1', '', 'calendar-2']);

    expect(fetchGoogleCalendarEventsMock).toHaveBeenCalledWith(['calendar-1', 'calendar-2']);
    expect(result).toEqual({
      type: 'success',
      events: googleEvents,
    });
  });

  test('loads device events, filters invalid records, and deduplicates equivalent events', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 14, 10, 30, 0, 0));
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    const fallbackStartDate = new Date(2026, 8, 14, 13, 0, 0, 0);
    getEventsMock.mockResolvedValueOnce([
      {
        id: 'outside-calendar',
        calendarId: 'other-calendar',
        title: 'Ignore me',
        location: 'Hall Building 110',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 0, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'bad-start',
        calendarId: 'device-calendar',
        title: 'Bad Start',
        location: 'Hall Building 110',
        startDate: 'not-a-date' as any,
        endDate: new Date(2026, 8, 14, 12, 0, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'bad-end',
        calendarId: 'device-calendar',
        title: 'Bad End',
        location: 'Hall Building 110',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 10, 0, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'cancelled-1',
        calendarId: 'device-calendar',
        title: 'Cancelled',
        location: 'Hall Building 110',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 0, 0, 0),
        status: 'cancelled',
      },
      {
        id: 'cancelled-2',
        calendarId: 'device-calendar',
        title: 'Canceled',
        location: 'Hall Building 110',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 0, 0, 0),
        status: 'canceled',
      },
      {
        id: 'event-1',
        calendarId: 'device-calendar',
        title: 'SOEN 321',
        location: 'Hall Building 435',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 15, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'event-duplicate',
        calendarId: 'device-calendar',
        title: '  soen 321  ',
        location: ' hall building 435 ',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 15, 0, 0),
        status: 'confirmed',
      },
      {
        id: '   ',
        calendarId: 'device-calendar',
        title: '   ',
        location: '   ',
        startDate: fallbackStartDate,
        endDate: undefined,
        status: 'confirmed',
      },
    ]);

    const result = await fetchCalendarEventsAsync(['device-calendar']);

    expect(result).toEqual({
      type: 'success',
      events: [
        {
          id: 'event-1',
          calendarId: 'device-calendar',
          title: 'SOEN 321',
          location: 'Hall Building 435',
          startsAt: new Date(2026, 8, 14, 11, 0, 0, 0).getTime(),
          endsAt: new Date(2026, 8, 14, 12, 15, 0, 0).getTime(),
        },
        {
          id: `device-calendar-${fallbackStartDate.getTime()}-7`,
          calendarId: 'device-calendar',
          title: 'Untitled event',
          location: null,
          startsAt: fallbackStartDate.getTime(),
        },
      ],
    });
  });

  test('returns the thrown device event error message', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getEventsMock.mockRejectedValueOnce(new Error('calendar events exploded'));

    const result = await fetchCalendarEventsAsync(['device-calendar']);

    expect(result).toEqual({
      type: 'error',
      message: 'calendar events exploded',
    });
  });

  test('returns the default device event error message for non-Error failures', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getEventsMock.mockRejectedValueOnce('calendar events failed');

    const result = await fetchCalendarEventsAsync(['device-calendar']);

    expect(result).toEqual({
      type: 'error',
      message: 'Unable to load upcoming classes right now. Please retry.',
    });
  });
});
