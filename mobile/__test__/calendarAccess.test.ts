import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as googleCalendarAuth from '../src/services/googleCalendarAuth';
import {
  connectCalendarAsync,
  fetchCalendarEventsAsync,
  fetchCalendarListAsync,
  getCalendarConnectionStateAsync,
} from '../src/services/calendarAccess';

const DEVICE_CALENDAR_ENABLED_STORAGE_KEY = 'gittocampus.deviceCalendar.enabled.v1';

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

describe('calendarAccess', () => {
  const getStoredSessionStateMock =
    googleCalendarAuth.getStoredGoogleCalendarSessionState as jest.Mock;
  const connectGoogleCalendarMock = googleCalendarAuth.connectGoogleCalendarAsync as jest.Mock;
  const getCalendarPermissionsMock = Calendar.getCalendarPermissionsAsync as jest.Mock;
  const requestCalendarPermissionsMock = Calendar.requestCalendarPermissionsAsync as jest.Mock;
  const getCalendarsMock = Calendar.getCalendarsAsync as jest.Mock;
  const getEventsMock = Calendar.getEventsAsync as jest.Mock;

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

  test('returns connected device state when local fallback is enabled and permission is granted', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    const result = await getCalendarConnectionStateAsync();

    expect(result).toEqual({
      status: 'connected',
      source: 'device',
      session: null,
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
      message:
        'Google Calendar sign-in is not supported here. Using device calendars instead. If your Google account syncs to this device, its events should appear here.',
    });
    expect(requestCalendarPermissionsMock).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)).toBe('true');
  });

  test('loads device calendars when the fallback source is active', async () => {
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
    getCalendarsMock.mockResolvedValueOnce([
      {
        id: 'device-primary',
        title: 'Personal',
        allowsModifications: true,
        isPrimary: true,
      },
      {
        id: 'device-shared',
        title: 'School',
        allowsModifications: false,
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

  test('loads active and upcoming device calendar events when the fallback source is active', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 14, 10, 30, 0, 0));
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    getEventsMock.mockResolvedValueOnce([
      {
        id: 'ended-class',
        calendarId: 'device-calendar',
        title: 'Ended Class',
        location: 'Hall Building 110',
        startDate: new Date(2026, 8, 14, 8, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 9, 0, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'next-class',
        calendarId: 'device-calendar',
        title: 'SOEN 321',
        location: 'Hall Building 435',
        startDate: new Date(2026, 8, 14, 11, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 12, 15, 0, 0),
        status: 'confirmed',
      },
      {
        id: 'cancelled-class',
        calendarId: 'device-calendar',
        title: 'Cancelled Class',
        location: 'Hall Building 999',
        startDate: new Date(2026, 8, 14, 13, 0, 0, 0),
        endDate: new Date(2026, 8, 14, 14, 0, 0, 0),
        status: 'cancelled',
      },
    ]);

    const result = await fetchCalendarEventsAsync(['device-calendar']);

    expect(result).toEqual({
      type: 'success',
      events: [
        {
          id: 'next-class',
          calendarId: 'device-calendar',
          title: 'SOEN 321',
          location: 'Hall Building 435',
          startsAt: new Date(2026, 8, 14, 11, 0, 0, 0).getTime(),
          endsAt: new Date(2026, 8, 14, 12, 15, 0, 0).getTime(),
        },
      ],
    });
  });
});
