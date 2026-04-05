import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_CALENDAR_ENABLED_STORAGE_KEY = 'gittocampus.deviceCalendar.enabled.v1';
const EXPO_CALENDAR_UNAVAILABLE_MESSAGE =
  'Device calendar access is unavailable in this build. Rebuild the app and try again.';

const loadCalendarAccess = () => {
  jest.resetModules();

  jest.doMock('../src/services/googleCalendarAuth', () => ({
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

  jest.doMock('../src/services/optionalExpoCalendar', () => ({
    EXPO_CALENDAR_UNAVAILABLE_MESSAGE,
    getOptionalExpoCalendarModule: jest.fn(() => null),
  }));

  const calendarAccess = require('../src/services/calendarAccess') as {
    connectCalendarAsync: () => Promise<unknown>;
    getCalendarConnectionStateAsync: () => Promise<unknown>;
  };
  const googleCalendarAuth = require('../src/services/googleCalendarAuth') as {
    connectGoogleCalendarAsync: jest.Mock;
  };

  return {
    ...calendarAccess,
    connectGoogleCalendarAsyncMock: googleCalendarAuth.connectGoogleCalendarAsync,
  };
};

describe('calendarAccess with unavailable ExpoCalendar native module', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('returns a normal error when Google auth fails and the device fallback is unavailable', async () => {
    const { connectCalendarAsync, connectGoogleCalendarAsyncMock } = loadCalendarAccess();
    connectGoogleCalendarAsyncMock.mockResolvedValueOnce({
      type: 'error',
      message: 'Google auth exploded.',
    });

    await expect(connectCalendarAsync()).resolves.toEqual({
      type: 'error',
      message: `Google auth exploded. ${EXPO_CALENDAR_UNAVAILABLE_MESSAGE}`,
    });
  });

  test('treats device calendar fallback as disconnected when the native module is unavailable', async () => {
    const { getCalendarConnectionStateAsync } = loadCalendarAccess();
    await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');

    await expect(getCalendarConnectionStateAsync()).resolves.toEqual({
      status: 'not_connected',
      source: null,
      session: null,
    });
  });
});
