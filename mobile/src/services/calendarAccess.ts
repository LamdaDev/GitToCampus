import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import {
  clearGoogleCalendarSession,
  connectGoogleCalendarAsync,
  fetchGoogleCalendarEventsAsync,
  fetchGoogleCalendarListAsync,
  getStoredGoogleCalendarSessionState,
  isGoogleCalendarEventActiveOrUpcoming,
  type GoogleCalendarConnectionStatus,
  type GoogleCalendarEventItem,
  type GoogleCalendarListItem,
  type GoogleCalendarSession,
} from './googleCalendarAuth';

const DEVICE_CALENDAR_ENABLED_STORAGE_KEY = 'gittocampus.deviceCalendar.enabled.v1';
const DEVICE_CALENDAR_EVENTS_LOOKAHEAD_DAYS = 30;
const ENABLE_DEVICE_CALENDAR_FALLBACK_MESSAGE =
  'Using device calendars instead. If your Google account syncs to this device, its events should appear here.';
const CONNECT_CALENDAR_FIRST_MESSAGE =
  'Connect Google Calendar or enable device calendar access before loading your calendars.';
const CONNECT_CLASSES_FIRST_MESSAGE =
  'Connect Google Calendar or enable device calendar access before loading your upcoming classes.';
const CALENDAR_LIST_ERROR_MESSAGE = 'Unable to load calendar list right now. Please retry.';
const CALENDAR_EVENTS_ERROR_MESSAGE = 'Unable to load upcoming classes right now. Please retry.';
const DEVICE_CALENDAR_CONNECT_ERROR_MESSAGE =
  'Unable to enable device calendar access right now. Please try again.';

export type CalendarConnectionSource = 'google' | 'device';
export type CalendarConnectionStatus = GoogleCalendarConnectionStatus;
export type CalendarSession = GoogleCalendarSession;
export type CalendarEventItem = GoogleCalendarEventItem;
export type CalendarListItem = GoogleCalendarListItem;

export type CalendarConnectionState = {
  status: Exclude<CalendarConnectionStatus, 'loading'>;
  source: CalendarConnectionSource | null;
  session: CalendarSession | null;
};

export type CalendarConnectResult =
  | {
      type: 'success';
      source: CalendarConnectionSource;
      session: CalendarSession | null;
      message?: string;
    }
  | { type: 'cancel' }
  | { type: 'denied'; message?: string }
  | { type: 'error'; message: string };

export type CalendarListResult =
  | { type: 'success'; calendars: CalendarListItem[] }
  | { type: 'error'; message: string };

export type CalendarEventsResult =
  | { type: 'success'; events: CalendarEventItem[] }
  | { type: 'error'; message: string };

type DeviceCalendarFallbackResult =
  | Extract<CalendarConnectResult, { type: 'success' }>
  | Extract<CalendarConnectResult, { type: 'denied' }>
  | Extract<CalendarConnectResult, { type: 'error' }>;

type DeviceCalendarItem = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];
type DeviceCalendarEvent = Awaited<ReturnType<typeof Calendar.getEventsAsync>>[number];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const joinMessages = (...parts: Array<string | null | undefined>) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ');

const mapCalendarListErrorToMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return CALENDAR_LIST_ERROR_MESSAGE;
};

const mapCalendarEventsErrorToMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return CALENDAR_EVENTS_ERROR_MESSAGE;
};

const normalizeCalendarEventText = (value: string | null) =>
  (value ?? '').trim().toUpperCase().replaceAll(/\s+/g, ' ');

const toEventDedupKey = (event: CalendarEventItem) =>
  `${normalizeCalendarEventText(event.title)}|${normalizeCalendarEventText(event.location)}|${event.startsAt}`;

const dedupeCalendarEvents = (events: CalendarEventItem[]): CalendarEventItem[] => {
  const dedupedEvents = new Map<string, CalendarEventItem>();

  for (const event of events) {
    const key = toEventDedupKey(event);
    if (!dedupedEvents.has(key)) {
      dedupedEvents.set(key, event);
    }
  }

  return Array.from(dedupedEvents.values());
};

const getDeviceCalendarEnabledAsync = async () => {
  try {
    return (await AsyncStorage.getItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY)) === 'true';
  } catch {
    return false;
  }
};

const enableDeviceCalendarAsync = async () => {
  await AsyncStorage.setItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY, 'true');
};

const disableDeviceCalendarAsync = async () => {
  await AsyncStorage.removeItem(DEVICE_CALENDAR_ENABLED_STORAGE_KEY);
};

const toDeviceCalendarListItem = (calendar: DeviceCalendarItem): CalendarListItem | null => {
  const id = calendar?.id;
  const name = calendar?.title;

  if (!isNonEmptyString(id) || !isNonEmptyString(name)) {
    return null;
  }

  return {
    id: id.trim(),
    name: name.trim(),
    accessRole: calendar.allowsModifications ? 'owner' : 'reader',
    isPrimary: calendar.isPrimary === true,
  };
};

const toDeviceCalendarEventItem = (
  event: DeviceCalendarEvent,
  index: number,
  allowedCalendarIds: Set<string>,
): CalendarEventItem | null => {
  const calendarId = event?.calendarId;
  if (!isNonEmptyString(calendarId) || !allowedCalendarIds.has(calendarId.trim())) {
    return null;
  }

  const startsAt = new Date(event.startDate).getTime();
  if (!Number.isFinite(startsAt)) {
    return null;
  }

  const endDate = event.endDate ? new Date(event.endDate).getTime() : null;
  if (endDate !== null && (!Number.isFinite(endDate) || endDate < startsAt)) {
    return null;
  }

  const status = String(event.status ?? '')
    .trim()
    .toLowerCase();
  if (status === 'canceled' || status === 'cancelled') {
    return null;
  }

  const title = isNonEmptyString(event.title) ? event.title.trim() : 'Untitled event';
  const location = isNonEmptyString(event.location) ? event.location.trim() : null;
  const id = isNonEmptyString(event.id) ? event.id.trim() : `${calendarId}-${startsAt}-${index}`;

  return {
    id,
    calendarId: calendarId.trim(),
    title,
    location,
    startsAt,
    ...(typeof endDate === 'number' ? { endsAt: endDate } : {}),
  };
};

const requestDeviceCalendarFallbackAsync = async (): Promise<DeviceCalendarFallbackResult> => {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) {
      return { type: 'denied' };
    }

    await enableDeviceCalendarAsync();

    return {
      type: 'success',
      source: 'device',
      session: null,
      message: ENABLE_DEVICE_CALENDAR_FALLBACK_MESSAGE,
    };
  } catch (error) {
    return {
      type: 'error',
      message:
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : DEVICE_CALENDAR_CONNECT_ERROR_MESSAGE,
    };
  }
};

const getConnectedCalendarSourceAsync = async (): Promise<CalendarConnectionState> => {
  const googleState = await getStoredGoogleCalendarSessionState();
  if (googleState.status === 'connected' && googleState.session) {
    return {
      status: 'connected',
      source: 'google',
      session: googleState.session,
    };
  }

  const isDeviceCalendarEnabled = await getDeviceCalendarEnabledAsync();
  if (!isDeviceCalendarEnabled) {
    return {
      status: googleState.status,
      source: null,
      session: googleState.session,
    };
  }

  try {
    const permission = await Calendar.getCalendarPermissionsAsync();
    if (!permission.granted) {
      await disableDeviceCalendarAsync();
      return {
        status: googleState.status,
        source: null,
        session: googleState.session,
      };
    }

    return {
      status: 'connected',
      source: 'device',
      session: null,
    };
  } catch {
    try {
      await disableDeviceCalendarAsync();
    } catch {
      // Ignore cleanup failures and fall back to the Google-derived state.
    }

    return {
      status: googleState.status,
      source: null,
      session: googleState.session,
    };
  }
};

export const getCalendarConnectionStateAsync = async (): Promise<CalendarConnectionState> =>
  getConnectedCalendarSourceAsync();

export const connectCalendarAsync = async (): Promise<CalendarConnectResult> => {
  const googleResult = await connectGoogleCalendarAsync();
  if (googleResult.type === 'success') {
    try {
      await disableDeviceCalendarAsync();
    } catch {
      // If this cleanup fails, still keep the successful Google connection.
    }

    return {
      type: 'success',
      source: 'google',
      session: googleResult.session,
    };
  }

  if (googleResult.type === 'cancel' || googleResult.type === 'denied') {
    return googleResult;
  }

  const deviceFallbackResult = await requestDeviceCalendarFallbackAsync();
  switch (deviceFallbackResult.type) {
    case 'success':
      return {
        ...deviceFallbackResult,
        message: joinMessages(googleResult.message, ENABLE_DEVICE_CALENDAR_FALLBACK_MESSAGE),
      };
    case 'denied':
      return {
        type: 'error',
        message: joinMessages(googleResult.message, 'Device calendar permission was denied.'),
      };
    case 'error':
      return {
        type: 'error',
        message: joinMessages(googleResult.message, deviceFallbackResult.message),
      };
  }
};

export const clearCalendarConnectionAsync = async (
  source: CalendarConnectionSource | null,
): Promise<void> => {
  if (source === 'device') {
    await disableDeviceCalendarAsync();
    return;
  }

  if (source === 'google') {
    await clearGoogleCalendarSession();
    return;
  }

  await Promise.all([clearGoogleCalendarSession(), disableDeviceCalendarAsync()]);
};

const fetchDeviceCalendarListAsync = async (): Promise<CalendarListResult> => {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const listItems = calendars
      .map(toDeviceCalendarListItem)
      .filter((item): item is CalendarListItem => item !== null)
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));

    return {
      type: 'success',
      calendars: listItems,
    };
  } catch (error) {
    return {
      type: 'error',
      message: mapCalendarListErrorToMessage(error),
    };
  }
};

const fetchDeviceCalendarEventsAsync = async (
  calendarIds: string[],
): Promise<CalendarEventsResult> => {
  const uniqueCalendarIds = [...new Set(calendarIds.map((id) => id.trim()).filter(Boolean))];

  const now = new Date();
  const nowTimestamp = now.getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfLookaheadWindow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + DEVICE_CALENDAR_EVENTS_LOOKAHEAD_DAYS + 1,
  );

  try {
    const deviceEvents = await Calendar.getEventsAsync(
      uniqueCalendarIds,
      startOfToday,
      endOfLookaheadWindow,
    );
    const allowedCalendarIds = new Set(uniqueCalendarIds);
    const activeOrUpcomingEvents = deviceEvents
      .map((event, index) => toDeviceCalendarEventItem(event, index, allowedCalendarIds))
      .filter((event): event is CalendarEventItem => event !== null)
      .filter((event) => isGoogleCalendarEventActiveOrUpcoming(event, nowTimestamp))
      .sort((a, b) => a.startsAt - b.startsAt);

    return {
      type: 'success',
      events: dedupeCalendarEvents(activeOrUpcomingEvents),
    };
  } catch (error) {
    return {
      type: 'error',
      message: mapCalendarEventsErrorToMessage(error),
    };
  }
};

export const fetchCalendarListAsync = async (): Promise<CalendarListResult> => {
  const connectionState = await getConnectedCalendarSourceAsync();
  if (connectionState.status !== 'connected' || !connectionState.source) {
    return {
      type: 'error',
      message: CONNECT_CALENDAR_FIRST_MESSAGE,
    };
  }

  if (connectionState.source === 'google') {
    return fetchGoogleCalendarListAsync();
  }

  return fetchDeviceCalendarListAsync();
};

export const fetchCalendarEventsAsync = async (
  calendarIds: string[],
): Promise<CalendarEventsResult> => {
  const uniqueCalendarIds = [...new Set(calendarIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueCalendarIds.length === 0) {
    return { type: 'success', events: [] };
  }

  const connectionState = await getConnectedCalendarSourceAsync();
  if (connectionState.status !== 'connected' || !connectionState.source) {
    return {
      type: 'error',
      message: CONNECT_CLASSES_FIRST_MESSAGE,
    };
  }

  if (connectionState.source === 'google') {
    return fetchGoogleCalendarEventsAsync(uniqueCalendarIds);
  }

  return fetchDeviceCalendarEventsAsync(uniqueCalendarIds);
};

export const DEVICE_CALENDAR_CONNECTED_HELPER_MESSAGE = ENABLE_DEVICE_CALENDAR_FALLBACK_MESSAGE;
