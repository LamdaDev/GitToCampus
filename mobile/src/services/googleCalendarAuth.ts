import * as AuthSession from 'expo-auth-session';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

const GOOGLE_CALENDAR_STORAGE_KEY = 'gittocampus.googleCalendar.session.v1';
const GOOGLE_CALENDAR_KEYCHAIN_SERVICE = 'gittocampus.googleCalendar';
const GOOGLE_CALENDAR_LIST_ENDPOINT =
  'https://www.googleapis.com/calendar/v3/users/me/calendarList';
const GOOGLE_CALENDAR_EVENTS_ENDPOINT = 'https://www.googleapis.com/calendar/v3/calendars';
const TOKEN_EXPIRY_GRACE_MS = 60_000;
const FALLBACK_ACCESS_TOKEN_TTL_SECONDS = 3600;
const GOOGLE_CALENDAR_REDIRECT_PATH = 'oauthredirect';
const APP_SCHEME = 'gittocampus';
const ANDROID_PACKAGE_FALLBACK = 'com.anonymous.mobile';

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

export type GoogleCalendarListItem = {
  id: string;
  name: string;
  accessRole: string | null;
  isPrimary: boolean;
};

export type GoogleCalendarListResult =
  | { type: 'success'; calendars: GoogleCalendarListItem[] }
  | { type: 'error'; message: string };

export type GoogleCalendarEventItem = {
  id: string;
  calendarId: string;
  title: string;
  location: string | null;
  startsAt: number;
};

export type GoogleCalendarEventsResult =
  | { type: 'success'; events: GoogleCalendarEventItem[] }
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
  if (candidate.refreshToken !== undefined && !isNonEmptyString(candidate.refreshToken)) {
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

const getRedirectScheme = (): string =>
  Platform.OS === 'android'
    ? (Application.applicationId ?? ANDROID_PACKAGE_FALLBACK).trim()
    : APP_SCHEME;

const createRedirectUri = () =>
  AuthSession.makeRedirectUri({
    // Google OAuth for installed apps expects a native redirect URI.
    native: `${getRedirectScheme()}:/${GOOGLE_CALENDAR_REDIRECT_PATH}`,
    path: GOOGLE_CALENDAR_REDIRECT_PATH,
  });

const isExpoGoRedirectUri = (redirectUri: string) => redirectUri.startsWith('exp://');

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

const mapCalendarListErrorToMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Unable to load calendar list right now. Please retry.';
};

const mapCalendarEventsErrorToMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return 'Unable to load upcoming classes right now. Please retry.';
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

const parseCalendarListItems = (value: unknown): GoogleCalendarListItem[] => {
  if (!value || typeof value !== 'object') return [];

  const payload = value as { items?: unknown };
  if (!Array.isArray(payload.items)) return [];

  return payload.items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;

      const candidate = item as Record<string, unknown>;
      const id = candidate.id;
      const name = candidate.summaryOverride ?? candidate.summary;
      if (!isNonEmptyString(id) || !isNonEmptyString(name)) return null;

      return {
        id,
        name: name.trim(),
        accessRole: isNonEmptyString(candidate.accessRole) ? candidate.accessRole : null,
        isPrimary: candidate.primary === true,
      } as GoogleCalendarListItem;
    })
    .filter((item): item is GoogleCalendarListItem => item !== null);
};

const parseCalendarEventStartTime = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null;

  const start = value as { dateTime?: unknown; date?: unknown };
  const startValue = start.dateTime ?? start.date;
  if (!isNonEmptyString(startValue)) return null;

  const startsAt = new Date(startValue).getTime();
  return Number.isFinite(startsAt) ? startsAt : null;
};

const parseCalendarEventItems = (calendarId: string, value: unknown): GoogleCalendarEventItem[] => {
  if (!value || typeof value !== 'object') return [];

  const payload = value as { items?: unknown };
  if (!Array.isArray(payload.items)) return [];

  return payload.items
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;

      const candidate = item as Record<string, unknown>;
      const startsAt = parseCalendarEventStartTime(candidate.start);
      if (startsAt === null) return null;

      const rawId = candidate.id;
      const title = isNonEmptyString(candidate.summary)
        ? candidate.summary.trim()
        : 'Untitled event';
      const location = isNonEmptyString(candidate.location) ? candidate.location.trim() : null;
      const id = isNonEmptyString(rawId) ? rawId.trim() : `${calendarId}-${startsAt}-${index}`;

      return {
        id,
        calendarId,
        title,
        location,
        startsAt,
      } as GoogleCalendarEventItem;
    })
    .filter((item): item is GoogleCalendarEventItem => item !== null);
};

export const fetchGoogleCalendarListAsync = async (): Promise<GoogleCalendarListResult> => {
  const state = await getStoredGoogleCalendarSessionState();
  if (state.status !== 'connected' || !state.session) {
    return {
      type: 'error',
      message: 'Connect Google Calendar before loading your calendars.',
    };
  }

  try {
    const response = await fetch(GOOGLE_CALENDAR_LIST_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${state.session.accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return {
          type: 'error',
          message: 'Calendar authorization expired. Reconnect Google Calendar and try again.',
        };
      }
      return {
        type: 'error',
        message: 'Unable to load calendar list right now. Please retry.',
      };
    }

    const payload: unknown = await response.json();
    return {
      type: 'success',
      calendars: parseCalendarListItems(payload),
    };
  } catch (error) {
    return {
      type: 'error',
      message: mapCalendarListErrorToMessage(error),
    };
  }
};

export const fetchGoogleCalendarEventsAsync = async (
  calendarIds: string[],
): Promise<GoogleCalendarEventsResult> => {
  const uniqueCalendarIds = [...new Set(calendarIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueCalendarIds.length === 0) {
    return { type: 'success', events: [] };
  }

  const state = await getStoredGoogleCalendarSessionState();
  if (state.status !== 'connected' || !state.session) {
    return {
      type: 'error',
      message: 'Connect Google Calendar before loading your upcoming classes.',
    };
  }

  const timeMin = new Date().toISOString();

  try {
    const responses = await Promise.all(
      uniqueCalendarIds.map(async (calendarId) => {
        const endpoint =
          `${GOOGLE_CALENDAR_EVENTS_ENDPOINT}/${encodeURIComponent(calendarId)}` +
          `/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}` +
          '&maxResults=20';

        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${state.session!.accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          return { calendarId, response, payload: null as unknown };
        }

        const payload: unknown = await response.json();
        return { calendarId, response, payload };
      }),
    );

    const unauthorized = responses.some(
      ({ response }) => response.status === 401 || response.status === 403,
    );
    if (unauthorized) {
      return {
        type: 'error',
        message: 'Calendar authorization expired. Reconnect Google Calendar and try again.',
      };
    }

    const hasFailedResponse = responses.some(({ response }) => !response.ok);
    if (hasFailedResponse) {
      return {
        type: 'error',
        message: 'Unable to load upcoming classes right now. Please retry.',
      };
    }

    const events = responses
      .flatMap(({ calendarId, payload }) => parseCalendarEventItems(calendarId, payload))
      .sort((a, b) => a.startsAt - b.startsAt);

    return { type: 'success', events };
  } catch (error) {
    return {
      type: 'error',
      message: mapCalendarEventsErrorToMessage(error),
    };
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
  if (__DEV__) {
    console.info('[GoogleCalendarAuth] OAuth request config', {
      clientId,
      redirectUri,
      platform: Platform.OS,
    });
  }

  if (isExpoGoRedirectUri(redirectUri)) {
    return {
      type: 'error',
      message:
        'Google Calendar sign-in is not supported in Expo Go. Use a development build and try again.',
    };
  }

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

      const oauthErrorDescription = (promptResult.params.error_description ?? '').trim();
      return {
        type: 'error',
        message: oauthErrorDescription || mapPromptErrorToMessage(promptResult.error),
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
