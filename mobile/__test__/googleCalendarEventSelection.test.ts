import {
  getSupportedActiveOrUpcomingEvents,
  getSupportedCalendarEvents,
} from '../src/utils/googleCalendarEventSelection';
import * as calendarRouteLocation from '../src/utils/calendarRouteLocation';

jest.mock('../src/utils/calendarRouteLocation', () => ({
  isSupportedCalendarEventLocation: jest.fn(),
}));

describe('googleCalendarEventSelection', () => {
  const isSupportedCalendarEventLocationMock =
    calendarRouteLocation.isSupportedCalendarEventLocation as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    isSupportedCalendarEventLocationMock.mockImplementation(
      (location: string | null) => location === 'Hall Building 455' || location === 'H 820',
    );
  });

  test('returns aligned active/upcoming and supported active/upcoming selections', () => {
    const nowTimestamp = new Date(2030, 1, 19, 9, 0, 0).getTime();
    const events = [
      {
        id: 'ended-event',
        calendarId: 'calendar-1',
        title: 'Ended',
        location: 'Hall Building 455',
        startsAt: new Date(2030, 1, 19, 7, 0, 0).getTime(),
        endsAt: new Date(2030, 1, 19, 8, 0, 0).getTime(),
      },
      {
        id: 'unsupported-upcoming',
        calendarId: 'calendar-2',
        title: 'Off Campus',
        location: 'Downtown Cafe',
        startsAt: new Date(2030, 1, 19, 11, 0, 0).getTime(),
        endsAt: new Date(2030, 1, 19, 12, 0, 0).getTime(),
      },
      {
        id: 'supported-later',
        calendarId: 'calendar-2',
        title: 'Later Class',
        location: 'Hall Building 455',
        startsAt: new Date(2030, 1, 19, 12, 0, 0).getTime(),
        endsAt: new Date(2030, 1, 19, 13, 0, 0).getTime(),
      },
      {
        id: 'supported-earlier',
        calendarId: 'calendar-1',
        title: 'Soon Class',
        location: 'H 820',
        startsAt: new Date(2030, 1, 19, 10, 0, 0).getTime(),
        endsAt: new Date(2030, 1, 19, 11, 0, 0).getTime(),
      },
    ];

    const supportedEvents = getSupportedCalendarEvents(events);
    const result = getSupportedActiveOrUpcomingEvents({
      events,
      nowTimestamp,
      supportedEvents,
    });

    expect(supportedEvents.map((event) => event.id)).toEqual([
      'ended-event',
      'supported-later',
      'supported-earlier',
    ]);
    expect(result.activeOrUpcomingEvents.map((event) => event.id)).toEqual([
      'supported-earlier',
      'unsupported-upcoming',
      'supported-later',
    ]);
    expect(result.supportedActiveOrUpcomingEvents.map((event) => event.id)).toEqual([
      'supported-earlier',
      'supported-later',
    ]);
    expect(result.hasOnlyUnsupportedActiveOrUpcomingEvents).toBe(false);
  });

  test('reports when only unsupported active or upcoming events remain', () => {
    const nowTimestamp = new Date(2030, 1, 19, 9, 0, 0).getTime();
    const events = [
      {
        id: 'unsupported-upcoming',
        calendarId: 'calendar-1',
        title: 'Off Campus',
        location: 'Downtown Cafe',
        startsAt: new Date(2030, 1, 19, 10, 0, 0).getTime(),
        endsAt: new Date(2030, 1, 19, 11, 0, 0).getTime(),
      },
    ];

    const result = getSupportedActiveOrUpcomingEvents({
      events,
      nowTimestamp,
    });

    expect(result.activeOrUpcomingEvents.map((event) => event.id)).toEqual([
      'unsupported-upcoming',
    ]);
    expect(result.supportedActiveOrUpcomingEvents).toEqual([]);
    expect(result.hasOnlyUnsupportedActiveOrUpcomingEvents).toBe(true);
  });
});
