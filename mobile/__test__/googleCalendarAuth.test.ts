import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  connectGoogleCalendarAsync,
  fetchGoogleCalendarEventsAsync,
  fetchGoogleCalendarListAsync,
  getStoredGoogleCalendarSessionState,
  saveGoogleCalendarSession,
} from '../src/services/googleCalendarAuth';

const STORAGE_KEY = 'gittocampus.googleCalendar.session.v1';
const originalFetch = global.fetch;

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-application', () => ({
  applicationId: 'com.anonymous.mobile',
}));

jest.mock('expo-auth-session', () => ({
  ResponseType: {
    Code: 'code',
  },
  makeRedirectUri: jest.fn(() => 'gittocampus://oauthredirect'),
  loadAsync: jest.fn(),
  exchangeCodeAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __mockStore: store,
  };
});

describe('googleCalendarAuth', () => {
  const authSessionMock = AuthSession as unknown as {
    loadAsync: jest.Mock;
    exchangeCodeAsync: jest.Mock;
    makeRedirectUri: jest.Mock;
  };
  const secureStoreMock = SecureStore as typeof SecureStore & {
    __mockStore: Map<string, string>;
  };
  const webBrowserMock = WebBrowser as unknown as {
    maybeCompleteAuthSession: jest.Mock;
  };
  const fetchMock = jest.fn();
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    secureStoreMock.__mockStore.clear();
    fetchMock.mockReset();
    (global as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;
    authSessionMock.makeRedirectUri.mockReturnValue('gittocampus://oauthredirect');
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID = 'android-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID = 'ios-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID = 'web-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = '';
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
  });

  afterAll(() => {
    (global as { fetch?: typeof fetch }).fetch = originalFetch;
  });
  test('returns connected state for a valid stored session', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'token-1',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    const state = await getStoredGoogleCalendarSessionState();

    expect(state.status).toBe('connected');
    expect(state.session?.accessToken).toBe('token-1');
  });

  test('returns expired state and clears storage when the token is expired', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'expired-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() - 60 * 1000,
    });

    const state = await getStoredGoogleCalendarSessionState();

    expect(state.status).toBe('expired');
    expect(state.session).toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  test('returns not connected and clears storage for invalid stored json', async () => {
    secureStoreMock.__mockStore.set(STORAGE_KEY, '{this-is-invalid-json');

    const state = await getStoredGoogleCalendarSessionState();

    expect(state).toEqual({ status: 'not_connected', session: null });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  test('returns not connected and clears storage for invalid refresh token shape', async () => {
    secureStoreMock.__mockStore.set(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: 'token',
        tokenType: 'Bearer',
        scope: GOOGLE_CALENDAR_READONLY_SCOPE,
        expiresAt: Date.now() + 100_000,
        refreshToken: '   ',
      }),
    );

    const state = await getStoredGoogleCalendarSessionState();

    expect(state).toEqual({ status: 'not_connected', session: null });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(1);
  });

  test('returns not connected when secure store read fails', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockRejectedValueOnce(new Error('read failed'));

    const state = await getStoredGoogleCalendarSessionState();

    expect(state).toEqual({ status: 'not_connected', session: null });
  });

  test('returns error when calendar list is requested without active session', async () => {
    const result = await fetchGoogleCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Connect Google Calendar before loading your calendars.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fetches and parses calendars when the session is valid', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'calendar-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { id: 'primary-id', summary: 'Main Calendar', primary: true, accessRole: 'owner' },
          { id: 'shared-id', summaryOverride: 'Shared Team Calendar', accessRole: 'reader' },
          { id: 'invalid-id', summary: '   ' },
        ],
      }),
    });

    const result = await fetchGoogleCalendarListAsync();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer calendar-token',
        }),
      }),
    );
    expect(result).toEqual({
      type: 'success',
      calendars: [
        {
          id: 'primary-id',
          name: 'Main Calendar',
          accessRole: 'owner',
          isPrimary: true,
        },
        {
          id: 'shared-id',
          name: 'Shared Team Calendar',
          accessRole: 'reader',
          isPrimary: false,
        },
      ],
    });
  });

  test('returns reconnect message when calendar list request is unauthorized', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'expired-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    const result = await fetchGoogleCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Calendar authorization expired. Reconnect Google Calendar and try again.',
    });
  });

  test('returns fallback message when calendar list request fails', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'live-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock.mockRejectedValueOnce('network down');

    const result = await fetchGoogleCalendarListAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Unable to load calendar list right now. Please retry.',
    });
  });

  test('returns empty upcoming classes when selected calendar ids is empty', async () => {
    const result = await fetchGoogleCalendarEventsAsync([]);

    expect(result).toEqual({
      type: 'success',
      events: [],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns error when upcoming classes are requested without active session', async () => {
    const result = await fetchGoogleCalendarEventsAsync(['calendar-1']);

    expect(result).toEqual({
      type: 'error',
      message: 'Connect Google Calendar before loading your upcoming classes.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('fetches and merges upcoming classes across selected calendars', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'calendar-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'event-b',
              summary: 'Software Testing',
              location: 'MB 5.105',
              start: { dateTime: '2030-02-19T13:00:00.000Z' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'event-a',
              summary: 'Data Structures',
              location: 'Faubourg Building C080',
              start: { dateTime: '2030-02-19T12:00:00.000Z' },
            },
            {
              id: 'event-c',
              summary: '   ',
              start: { dateTime: '2030-02-19T14:00:00.000Z' },
            },
          ],
        }),
      });

    const result = await fetchGoogleCalendarEventsAsync(['calendar-1', 'calendar-2']);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('/calendar-1/events'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer calendar-token',
        }),
      }),
    );
    expect(result).toEqual({
      type: 'success',
      events: [
        {
          id: 'event-a',
          calendarId: 'calendar-2',
          title: 'Data Structures',
          location: 'Faubourg Building C080',
          startsAt: new Date('2030-02-19T12:00:00.000Z').getTime(),
        },
        {
          id: 'event-b',
          calendarId: 'calendar-1',
          title: 'Software Testing',
          location: 'MB 5.105',
          startsAt: new Date('2030-02-19T13:00:00.000Z').getTime(),
        },
        {
          id: 'event-c',
          calendarId: 'calendar-2',
          title: 'Untitled event',
          location: null,
          startsAt: new Date('2030-02-19T14:00:00.000Z').getTime(),
        },
      ],
    });
  });

  test('returns reconnect message when upcoming classes request is unauthorized', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'expired-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    const result = await fetchGoogleCalendarEventsAsync(['calendar-1']);

    expect(result).toEqual({
      type: 'error',
      message: 'Calendar authorization expired. Reconnect Google Calendar and try again.',
    });
  });

  test('returns fallback message when upcoming classes request fails', async () => {
    await saveGoogleCalendarSession({
      accessToken: 'live-token',
      tokenType: 'Bearer',
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    fetchMock.mockRejectedValueOnce('network down');

    const result = await fetchGoogleCalendarEventsAsync(['calendar-1']);

    expect(result).toEqual({
      type: 'error',
      message: 'Unable to load upcoming classes right now. Please retry.',
    });
  });

  test('returns error when oauth client id is missing', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID = '';

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message:
        'Google Calendar OAuth client ID is missing. Configure EXPO_PUBLIC_GOOGLE_CALENDAR_*_CLIENT_ID.',
    });
  });

  test('builds native redirect uri from the app identifier', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'cancel' })),
    });

    await connectGoogleCalendarAsync();

    expect(authSessionMock.makeRedirectUri).toHaveBeenCalledWith({
      native: 'com.anonymous.mobile:/oauthredirect',
      path: 'oauthredirect',
    });
  });

  test('uses a Google iOS-client redirect scheme when the iOS client id is valid', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID =
      '84039552841-5f103afd16hji1k39pt9i2tghnsumr9q.apps.googleusercontent.com';

    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'cancel' })),
    });

    await connectGoogleCalendarAsync();

    expect(authSessionMock.makeRedirectUri).toHaveBeenCalledWith({
      native: 'com.googleusercontent.apps.84039552841-5f103afd16hji1k39pt9i2tghnsumr9q:/oauthredirect',
      path: 'oauthredirect',
    });
  });

  test('returns cancel when the auth prompt is canceled', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'cancel' })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({ type: 'cancel' });
    expect(webBrowserMock.maybeCompleteAuthSession).toHaveBeenCalledTimes(1);
  });

  test('returns cancel when the auth prompt is dismissed', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'dismiss' })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({ type: 'cancel' });
  });

  test('returns error when auth prompt is locked', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'locked' })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Google sign-in is already active. Please wait and try again.',
    });
  });

  test('returns denied when permissions are denied', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: { error: 'access_denied' },
        error: null,
      })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({ type: 'denied' });
  });

  test('returns oauth error description from response params', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: 'Custom oauth error',
        },
        error: null,
      })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Custom oauth error',
    });
  });

  test('maps auth error code to denied calendar message', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: '   ',
        },
        error: {
          code: 'access_denied',
        },
      })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Calendar access was denied.',
    });
  });

  test('maps auth error description and message fallback values', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: '   ',
        },
        error: {
          description: 'Auth description',
          message: 'Auth message',
        },
      })),
    });

    const descriptionResult = await connectGoogleCalendarAsync();

    expect(descriptionResult).toEqual({
      type: 'error',
      message: 'Auth description',
    });

    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: '   ',
        },
        error: {
          description: '   ',
          message: 'Auth message',
        },
      })),
    });

    const messageResult = await connectGoogleCalendarAsync();

    expect(messageResult).toEqual({
      type: 'error',
      message: 'Auth message',
    });

    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'error',
        params: {
          error: 'invalid_request',
          error_description: '   ',
        },
        error: {
          description: '   ',
          message: '   ',
        },
      })),
    });

    const fallbackResult = await connectGoogleCalendarAsync();

    expect(fallbackResult).toEqual({
      type: 'error',
      message: 'Google authentication failed. Please try again.',
    });
  });

  test('returns error when running in Expo Go redirect flow', async () => {
    authSessionMock.makeRedirectUri.mockReturnValueOnce('exp://127.0.0.1:8081/--/oauthredirect');

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message:
        'Google Calendar sign-in is not supported in Expo Go. Use a development build and try again.',
    });
    expect(authSessionMock.loadAsync).not.toHaveBeenCalled();
    expect(webBrowserMock.maybeCompleteAuthSession).not.toHaveBeenCalled();
  });

  test('returns error when prompt result type is unexpected', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'opened' as any })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Google sign-in did not complete. Please try again.',
    });
  });

  test('returns error when success payload is missing auth code', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'success',
        params: {},
        authentication: null,
      })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({
      type: 'error',
      message: 'Google authentication completed without an authorization code.',
    });
  });

  test('exchanges auth code and stores session on successful sign-in', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier-123',
      promptAsync: jest.fn(async () => ({
        type: 'success',
        params: { code: 'auth-code-123' },
        authentication: null,
      })),
    });

    authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-123',
      tokenType: 'Bearer',
      expiresIn: 1800,
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
      refreshToken: 'refresh-token-123',
    });

    const result = await connectGoogleCalendarAsync();

    expect(result.type).toBe('success');
    if (result.type !== 'success') {
      throw new Error('Expected success result');
    }
    expect(result.session.accessToken).toBe('access-token-123');
    expect(result.session.refreshToken).toBe('refresh-token-123');
    expect(authSessionMock.exchangeCodeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'auth-code-123',
        extraParams: { code_verifier: 'verifier-123' },
      }),
      expect.any(Object),
    );

    const storedState = await getStoredGoogleCalendarSessionState();
    expect(storedState.status).toBe('connected');
    expect(storedState.session?.accessToken).toBe('access-token-123');
  });

  test('exchanges auth code without code_verifier when request has no verifier', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      promptAsync: jest.fn(async () => ({
        type: 'success',
        params: { code: 'auth-code-abc' },
        authentication: null,
      })),
    });

    authSessionMock.exchangeCodeAsync.mockResolvedValueOnce({
      accessToken: 'access-token-abc',
      tokenType: 'Bearer',
      expiresIn: 1200,
      scope: GOOGLE_CALENDAR_READONLY_SCOPE,
    });

    const result = await connectGoogleCalendarAsync();

    expect(result.type).toBe('success');
    expect(authSessionMock.exchangeCodeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'auth-code-abc',
        extraParams: undefined,
      }),
      expect.any(Object),
    );
  });

  test('uses prompt authentication response directly with fallback ttl and scope', async () => {
    const before = Date.now();

    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({
        type: 'success',
        params: {},
        authentication: {
          accessToken: 'direct-token',
          tokenType: 'Bearer',
        },
      })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result.type).toBe('success');
    if (result.type !== 'success') throw new Error('Expected success result');
    expect(result.session.scope).toBe(GOOGLE_CALENDAR_READONLY_SCOPE);
    expect(result.session.expiresAt).toBeGreaterThanOrEqual(before + 3_599_000);
    expect(result.session.expiresAt).toBeLessThanOrEqual(before + 3_601_000);
    expect(authSessionMock.exchangeCodeAsync).not.toHaveBeenCalled();
  });

  test('returns mapped message for thrown errors and unknown rejections', async () => {
    authSessionMock.loadAsync.mockRejectedValueOnce(new Error('OAuth exploded'));
    const errorResult = await connectGoogleCalendarAsync();
    expect(errorResult).toEqual({
      type: 'error',
      message: 'OAuth exploded',
    });

    authSessionMock.loadAsync.mockRejectedValueOnce('raw failure');
    const fallbackResult = await connectGoogleCalendarAsync();
    expect(fallbackResult).toEqual({
      type: 'error',
      message: 'Unable to connect Google Calendar right now. Please try again.',
    });
  });
});
