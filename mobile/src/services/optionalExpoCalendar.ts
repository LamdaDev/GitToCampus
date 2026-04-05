export type ExpoCalendarModule = typeof import('expo-calendar');

export const EXPO_CALENDAR_UNAVAILABLE_MESSAGE =
  'Device calendar access is unavailable in this build. Rebuild the app and try again.';

let cachedExpoCalendarModule: ExpoCalendarModule | null | undefined;

export const getOptionalExpoCalendarModule = (): ExpoCalendarModule | null => {
  if (cachedExpoCalendarModule !== undefined) {
    return cachedExpoCalendarModule;
  }

  try {
    cachedExpoCalendarModule = require('expo-calendar') as ExpoCalendarModule;
  } catch {
    cachedExpoCalendarModule = null;
  }

  return cachedExpoCalendarModule;
};
