import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useWindowDimensions, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import type { ListRenderItemInfo } from 'react-native';
import {
  fetchGoogleCalendarEventsAsync,
  isGoogleCalendarEventActiveOrUpcoming,
  type GoogleCalendarEventItem,
} from '../services/googleCalendarAuth';
import { upcomingClassesSliderStyles } from '../styles/UpcomingClassesSlider.styles';
import { isSupportedCalendarEventLocation } from '../utils/calendarRouteLocation';

type UpcomingClassesSliderProps = {
  selectedCalendarIds: string[];
  onReselectCalendars?: () => void;
  onClose?: () => void;
};

const MAX_VISIBLE_EVENTS = 8;
const MAX_EVENTS_TO_RENDER = 12;
const EVENT_ITEM_HEIGHT = 78;
const EVENT_ITEM_GAP = 8;
const MAX_VISIBLE_EVENTS_HEIGHT =
  EVENT_ITEM_HEIGHT * MAX_VISIBLE_EVENTS + EVENT_ITEM_GAP * (MAX_VISIBLE_EVENTS - 1);

const toOrdinalDay = (day: number) => {
  const remainder = day % 10;
  const remainderHundred = day % 100;
  if (remainder === 1 && remainderHundred !== 11) return `${day}st`;
  if (remainder === 2 && remainderHundred !== 12) return `${day}nd`;
  if (remainder === 3 && remainderHundred !== 13) return `${day}rd`;
  return `${day}th`;
};

const formatDisplayDate = (date: Date) => {
  const month = date.toLocaleDateString('en-US', { month: 'long' });
  return `${month} ${toOrdinalDay(date.getDate())}, ${date.getFullYear()}`;
};

const formatDisplayTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatEventTime = (date: Date) =>
  date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const formatEventDay = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

const formatEventDateTimeRange = (event: Pick<GoogleCalendarEventItem, 'startsAt' | 'endsAt'>) => {
  const startDate = new Date(event.startsAt);
  const startDateLabel = formatEventDay(startDate);
  const startTimeLabel = formatEventTime(startDate);

  if (typeof event.endsAt !== 'number' || !Number.isFinite(event.endsAt)) {
    return `${startDateLabel} ${startTimeLabel}`;
  }

  const endDate = new Date(event.endsAt);
  const endDateLabel = formatEventDay(endDate);
  if (startDateLabel !== endDateLabel) {
    return `${startDateLabel} ${startTimeLabel} - ${endDateLabel} ${formatEventTime(endDate)}`;
  }

  return `${startDateLabel} ${startTimeLabel} - ${formatEventTime(endDate)}`;
};

export default function UpcomingClassesSlider({
  selectedCalendarIds,
  onReselectCalendars,
  onClose,
}: Readonly<UpcomingClassesSliderProps>) {
  const { height: windowHeight } = useWindowDimensions();
  const [now, setNow] = useState(() => new Date());
  const [events, setEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [supportedEvents, setSupportedEvents] = useState<GoogleCalendarEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadUpcomingClasses = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    const result = await fetchGoogleCalendarEventsAsync(selectedCalendarIds);
    setIsLoading(false);

    if (result.type === 'error') {
      setEvents([]);
      setSupportedEvents([]);
      setErrorMessage(result.message);
      return;
    }

    setEvents(result.events);
    setSupportedEvents(
      result.events.filter((event) => isSupportedCalendarEventLocation(event.location)),
    );
  }, [selectedCalendarIds]);

  useEffect(() => {
    void loadUpcomingClasses();
  }, [loadUpcomingClasses]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, 30_000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const formattedDate = useMemo(() => formatDisplayDate(now), [now]);
  const formattedTime = useMemo(() => formatDisplayTime(now), [now]);
  const formattedDateTime = useMemo(
    () => `${formattedDate} ${formattedTime}`,
    [formattedDate, formattedTime],
  );
  const activeEvents = useMemo(() => {
    const nowTimestamp = now.getTime();
    return events
      .filter((event) => isGoogleCalendarEventActiveOrUpcoming(event, nowTimestamp))
      .sort((a, b) => a.startsAt - b.startsAt);
  }, [events, now]);
  const supportedActiveEvents = useMemo(
    () =>
      supportedEvents
        .filter((event) => isGoogleCalendarEventActiveOrUpcoming(event, now.getTime()))
        .sort((a, b) => a.startsAt - b.startsAt),
    [now, supportedEvents],
  );

  const displayedEvents = useMemo(
    () => supportedActiveEvents.slice(0, MAX_EVENTS_TO_RENDER),
    [supportedActiveEvents],
  );
  const hasMoreEvents = supportedActiveEvents.length > MAX_EVENTS_TO_RENDER;
  const isEventsListScrollable = displayedEvents.length > MAX_VISIBLE_EVENTS;
  const eventsListMaxHeight = isEventsListScrollable ? MAX_VISIBLE_EVENTS_HEIGHT : undefined;
  const hasOnlyUnsupportedUpcomingEvents =
    activeEvents.length > 0 && supportedActiveEvents.length === 0;
  const isEmptyUpcomingClasses = !isLoading && !errorMessage && supportedActiveEvents.length === 0;
  const emptyClassesMessage = useMemo(
    () =>
      hasOnlyUnsupportedUpcomingEvents
        ? `No upcoming classes with supported Concordia locations for ${formattedDate}.`
        : `No upcoming or in-progress classes for ${formattedDate}. Have a great day!`,
    [formattedDate, hasOnlyUnsupportedUpcomingEvents],
  );
  const shouldRenderUpcomingClassesList =
    !isLoading && !errorMessage && supportedActiveEvents.length > 0;
  const fixedCardHeight = useMemo(() => {
    const targetHeight = Math.round(windowHeight * 0.68);
    return Math.max(390, Math.min(targetHeight, 680));
  }, [windowHeight]);

  const renderEventItem = useCallback(
    ({ item: event }: ListRenderItemInfo<GoogleCalendarEventItem>) => {
      const eventDateTimeRange = formatEventDateTimeRange(event);

      return (
        <View
          testID={`upcoming-class-event-${event.id}`}
          style={upcomingClassesSliderStyles.eventItem}
        >
          <Ionicons name="book" size={18} color="#F5F1F2" />
          <View style={upcomingClassesSliderStyles.eventTextWrap}>
            <Text numberOfLines={1} style={upcomingClassesSliderStyles.eventTitleText}>
              {event.title}
            </Text>
            <Text
              testID={`upcoming-class-event-datetime-${event.id}`}
              numberOfLines={1}
              style={upcomingClassesSliderStyles.eventDateTimeText}
            >
              {eventDateTimeRange}
            </Text>
            <Text numberOfLines={1} style={upcomingClassesSliderStyles.eventMetaText}>
              {event.location ?? 'Location not provided'}
            </Text>
          </View>
        </View>
      );
    },
    [],
  );

  return (
    <View style={upcomingClassesSliderStyles.container} testID="upcoming-classes-slider">
      <View style={upcomingClassesSliderStyles.headerRow}>
        <Text
          testID="upcoming-classes-datetime"
          style={upcomingClassesSliderStyles.headerDateTimeText}
          numberOfLines={1}
        >
          {formattedDateTime}
        </Text>
        <TouchableOpacity
          testID="close-upcoming-classes-button"
          style={upcomingClassesSliderStyles.headerCloseButton}
          accessibilityRole="button"
          accessibilityLabel="Close upcoming classes"
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={[upcomingClassesSliderStyles.card, { height: fixedCardHeight }]}>
        <Text style={upcomingClassesSliderStyles.title}>Upcoming Classes:</Text>

        <View style={upcomingClassesSliderStyles.contentArea}>
          {isLoading ? (
            <Text testID="upcoming-classes-loading" style={upcomingClassesSliderStyles.infoText}>
              Loading upcoming classes...
            </Text>
          ) : null}

          {!isLoading && errorMessage ? (
            <>
              <Text testID="upcoming-classes-error" style={upcomingClassesSliderStyles.errorText}>
                {errorMessage}
              </Text>
              <TouchableOpacity
                testID="retry-upcoming-classes-button"
                style={upcomingClassesSliderStyles.retryButton}
                onPress={() => void loadUpcomingClasses()}
              >
                <Text style={upcomingClassesSliderStyles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {isEmptyUpcomingClasses ? (
            <Text testID="upcoming-classes-empty" style={upcomingClassesSliderStyles.infoText}>
              {emptyClassesMessage}
            </Text>
          ) : null}

          {shouldRenderUpcomingClassesList ? (
            <View
              style={[
                upcomingClassesSliderStyles.eventsViewport,
                eventsListMaxHeight ? { maxHeight: eventsListMaxHeight } : null,
              ]}
            >
              <BottomSheetFlatList<GoogleCalendarEventItem>
                data={displayedEvents}
                keyExtractor={(event: GoogleCalendarEventItem) =>
                  `${event.calendarId}-${event.id}-${event.startsAt}`
                }
                style={upcomingClassesSliderStyles.eventsList}
                contentContainerStyle={upcomingClassesSliderStyles.eventsContent}
                nestedScrollEnabled={true}
                scrollEnabled={isEventsListScrollable}
                showsVerticalScrollIndicator={isEventsListScrollable}
                keyboardShouldPersistTaps="handled"
                initialNumToRender={MAX_EVENTS_TO_RENDER}
                ListFooterComponent={
                  hasMoreEvents ? (
                    <Text
                      testID="upcoming-classes-overflow-indicator"
                      style={upcomingClassesSliderStyles.overflowIndicatorText}
                    >
                      ...
                    </Text>
                  ) : null
                }
                renderItem={renderEventItem}
              />
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          testID="reselect-calendars-button"
          style={upcomingClassesSliderStyles.reselectButton}
          onPress={onReselectCalendars}
        >
          <Text style={upcomingClassesSliderStyles.reselectButtonText}>Reselect Calendars</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
