import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {
  GOOGLE_CALENDAR_READONLY_SCOPE,
  connectGoogleCalendarAsync,
  getStoredGoogleCalendarSessionState,
  saveGoogleCalendarSession,
} from '../src/services/googleCalendarAuth';

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

  beforeEach(() => {
    jest.clearAllMocks();
    secureStoreMock.__mockStore.clear();
    authSessionMock.makeRedirectUri.mockReturnValue('gittocampus://oauthredirect');
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID = 'android-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID = 'ios-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID = 'web-client-id';
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

  test('returns cancel when the auth prompt is canceled', async () => {
    authSessionMock.loadAsync.mockResolvedValueOnce({
      codeVerifier: 'verifier',
      promptAsync: jest.fn(async () => ({ type: 'cancel' })),
    });

    const result = await connectGoogleCalendarAsync();

    expect(result).toEqual({ type: 'cancel' });
    expect(webBrowserMock.maybeCompleteAuthSession).toHaveBeenCalledTimes(1);
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
});
