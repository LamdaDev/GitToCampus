import {
  isGoogleCalendarEventActiveOrUpcoming,
  type GoogleCalendarEventItem,
} from '../services/googleCalendarAuth';
import { isSupportedCalendarEventLocation } from './calendarRouteLocation';

type SupportedActiveOrUpcomingEventsArgs = {
  events: GoogleCalendarEventItem[];
  nowTimestamp: number;
  supportedEvents?: GoogleCalendarEventItem[];
};

export type SupportedActiveOrUpcomingEventsResult = {
  activeOrUpcomingEvents: GoogleCalendarEventItem[];
  supportedActiveOrUpcomingEvents: GoogleCalendarEventItem[];
  hasOnlyUnsupportedActiveOrUpcomingEvents: boolean;
};

const sortCalendarEvents = (a: GoogleCalendarEventItem, b: GoogleCalendarEventItem) => {
  if (a.startsAt !== b.startsAt) return a.startsAt - b.startsAt;

  const calendarComparison = a.calendarId.localeCompare(b.calendarId);
  if (calendarComparison !== 0) return calendarComparison;

  return a.id.localeCompare(b.id);
};

const getActiveOrUpcomingCalendarEvents = (
  events: GoogleCalendarEventItem[],
  nowTimestamp: number,
) =>
  events
    .filter((event) => Number.isFinite(event.startsAt))
    .filter((event) => isGoogleCalendarEventActiveOrUpcoming(event, nowTimestamp))
    .sort(sortCalendarEvents);

export const getSupportedCalendarEvents = (events: GoogleCalendarEventItem[]) =>
  events.filter((event) => isSupportedCalendarEventLocation(event.location));

export const getSupportedActiveOrUpcomingEvents = ({
  events,
  nowTimestamp,
  supportedEvents,
}: SupportedActiveOrUpcomingEventsArgs): SupportedActiveOrUpcomingEventsResult => {
  const activeOrUpcomingEvents = getActiveOrUpcomingCalendarEvents(events, nowTimestamp);
  const supportedActiveOrUpcomingEvents = supportedEvents
    ? getActiveOrUpcomingCalendarEvents(supportedEvents, nowTimestamp)
    : activeOrUpcomingEvents.filter((event) => isSupportedCalendarEventLocation(event.location));

  return {
    activeOrUpcomingEvents,
    supportedActiveOrUpcomingEvents,
    hasOnlyUnsupportedActiveOrUpcomingEvents:
      activeOrUpcomingEvents.length > 0 && supportedActiveOrUpcomingEvents.length === 0,
  };
};
