import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const GOOGLE_CALENDAR_STORAGE_KEY = 'gittocampus.googleCalendar.session.v1';
const GOOGLE_CALENDAR_KEYCHAIN_SERVICE = 'gittocampus.googleCalendar';
const TOKEN_EXPIRY_GRACE_MS = 60_000;
const FALLBACK_ACCESS_TOKEN_TTL_SECONDS = 3600;

const GOOGLE_CALENDAR_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

const secureStoreOptions = {
  keychainService: GOOGLE_CALENDAR_KEYCHAIN_SERVICE,
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

export const GOOGLE_CALENDAR_READONLY_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

export type GoogleCalendarSession = {
  accessToken: string;
  tokenType: string;
  scope: string;
  expiresAt: number;
  refreshToken?: string;
};

export type GoogleCalendarConnectionStatus = 'loading' | 'connected' | 'not_connected' | 'expired';

export type GoogleCalendarSessionState = {
  status: Exclude<GoogleCalendarConnectionStatus, 'loading'>;
  session: GoogleCalendarSession | null;
};

export type GoogleCalendarConnectResult =
  | { type: 'success'; session: GoogleCalendarSession }
  | { type: 'cancel' }
  | { type: 'denied' }
  | { type: 'error'; message: string };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const parseStoredSession = (value: string): GoogleCalendarSession | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as Record<string, unknown>;
  if (!isNonEmptyString(candidate.accessToken)) return null;
  if (!isNonEmptyString(candidate.tokenType)) return null;
  if (!isNonEmptyString(candidate.scope)) return null;
  if (typeof candidate.expiresAt !== 'number' || !Number.isFinite(candidate.expiresAt)) {
    return null;
  }
  if (typeof candidate.refreshToken !== 'undefined' && !isNonEmptyString(candidate.refreshToken)) {
    return null;
  }

  return {
    accessToken: candidate.accessToken,
    tokenType: candidate.tokenType,
    scope: candidate.scope,
    expiresAt: candidate.expiresAt,
    refreshToken: candidate.refreshToken,
  };
};

const isSessionExpired = (session: Pick<GoogleCalendarSession, 'expiresAt'>) =>
  session.expiresAt <= Date.now() + TOKEN_EXPIRY_GRACE_MS;

const getConfiguredClientId = (): string => {
  const platformClientId = Platform.select({
    android: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID,
    ios: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID,
    default: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID,
  });

  const fallbackClientId = process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID;
  return (platformClientId ?? fallbackClientId ?? '').trim();
};

const createRedirectUri = () =>
  AuthSession.makeRedirectUri({
    path: 'oauthredirect',
  });

const toSession = (tokenResponse: AuthSession.TokenResponse): GoogleCalendarSession => {
  const expiresInSeconds = tokenResponse.expiresIn ?? FALLBACK_ACCESS_TOKEN_TTL_SECONDS;

  return {
    accessToken: tokenResponse.accessToken,
    tokenType: tokenResponse.tokenType,
    scope: tokenResponse.scope ?? GOOGLE_CALENDAR_READONLY_SCOPE,
    expiresAt: Date.now() + expiresInSeconds * 1000,
    refreshToken: tokenResponse.refreshToken,
  };
};

const mapPromptErrorToMessage = (error: AuthSession.AuthError | null | undefined): string => {
  const errorCode = (error?.code ?? '').toLowerCase();
  if (errorCode === 'access_denied') {
    return 'Calendar access was denied.';
  }

  const description = error?.description?.trim();
  if (description) return description;

  const message = error?.message?.trim();
  if (message) return message;

  return 'Google authentication failed. Please try again.';
};

const mapUnexpectedErrorToMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Unable to connect Google Calendar right now. Please try again.';
};

export const saveGoogleCalendarSession = async (session: GoogleCalendarSession): Promise<void> => {
  await SecureStore.setItemAsync(
    GOOGLE_CALENDAR_STORAGE_KEY,
    JSON.stringify(session),
    secureStoreOptions,
  );
};

export const clearGoogleCalendarSession = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(GOOGLE_CALENDAR_STORAGE_KEY, secureStoreOptions);
};

export const getStoredGoogleCalendarSessionState =
  async (): Promise<GoogleCalendarSessionState> => {
    try {
      const storedValue = await SecureStore.getItemAsync(
        GOOGLE_CALENDAR_STORAGE_KEY,
        secureStoreOptions,
      );
      if (!storedValue) {
        return { status: 'not_connected', session: null };
      }

      const session = parseStoredSession(storedValue);
      if (!session) {
        await clearGoogleCalendarSession();
        return { status: 'not_connected', session: null };
      }

      if (isSessionExpired(session)) {
        await clearGoogleCalendarSession();
        return { status: 'expired', session: null };
      }

      return { status: 'connected', session };
    } catch {
      return { status: 'not_connected', session: null };
    }
  };

export const connectGoogleCalendarAsync = async (): Promise<GoogleCalendarConnectResult> => {
  const clientId = getConfiguredClientId();
  if (!clientId) {
    return {
      type: 'error',
      message:
        'Google Calendar OAuth client ID is missing. Configure EXPO_PUBLIC_GOOGLE_CALENDAR_*_CLIENT_ID.',
    };
  }

  const redirectUri = createRedirectUri();

  try {
    WebBrowser.maybeCompleteAuthSession();

    const request = await AuthSession.loadAsync(
      {
        clientId,
        redirectUri,
        scopes: [GOOGLE_CALENDAR_READONLY_SCOPE],
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      },
      GOOGLE_CALENDAR_DISCOVERY,
    );

    const promptResult = await request.promptAsync(GOOGLE_CALENDAR_DISCOVERY);

    if (promptResult.type === 'cancel' || promptResult.type === 'dismiss') {
      return { type: 'cancel' };
    }

    if (promptResult.type === 'locked') {
      return {
        type: 'error',
        message: 'Google sign-in is already active. Please wait and try again.',
      };
    }

    if (promptResult.type === 'error') {
      if ((promptResult.params.error ?? '').toLowerCase() === 'access_denied') {
        return { type: 'denied' };
      }

      return {
        type: 'error',
        message: mapPromptErrorToMessage(promptResult.error),
      };
    }

    if (promptResult.type !== 'success') {
      return {
        type: 'error',
        message: 'Google sign-in did not complete. Please try again.',
      };
    }

    let tokenResponse = promptResult.authentication;

    if (!tokenResponse) {
      const authCode = promptResult.params.code;
      if (!isNonEmptyString(authCode)) {
        return {
          type: 'error',
          message: 'Google authentication completed without an authorization code.',
        };
      }

      tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId,
          code: authCode,
          redirectUri,
          extraParams: request.codeVerifier
            ? {
                code_verifier: request.codeVerifier,
              }
            : undefined,
        },
        GOOGLE_CALENDAR_DISCOVERY,
      );
    }

    const session = toSession(tokenResponse);
    await saveGoogleCalendarSession(session);

    return {
      type: 'success',
      session,
    };
  } catch (error) {
    return {
      type: 'error',
      message: mapUnexpectedErrorToMessage(error),
    };
  }
};
