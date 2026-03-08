import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarSelectionCard from './CalendarSelectionCard';
import { calendarSelectionSliderStyles } from '../styles/CalendarSelectionSlider.styles';
import {
  fetchGoogleCalendarListAsync,
  type GoogleCalendarListItem,
} from '../services/googleCalendarAuth';

const logCalendarSelectionDebug = (
  message: string,
  details?: Record<string, unknown> | undefined,
) => {
  if (!__DEV__) return;
  if (details) {
    console.info(`[CalendarSelectionSlider] ${message}`, details);
    return;
  }
  console.info(`[CalendarSelectionSlider] ${message}`);
};

type CalendarSelectionSliderProps = {
  initialSelectedCalendarIds?: string[];
  onDone?: (selectedCalendarIds: string[]) => void;
  onClose?: () => void;
};

export default function CalendarSelectionSlider({
  initialSelectedCalendarIds = [],
  onDone,
  onClose,
}: Readonly<CalendarSelectionSliderProps>) {
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [isCalendarListLoading, setIsCalendarListLoading] = useState(false);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>(
    initialSelectedCalendarIds,
  );
  const normalizedInitialSelectionKey = initialSelectedCalendarIds.join('|');

  useEffect(() => {
    const normalizedSelection = [...new Set(initialSelectedCalendarIds)];
    logCalendarSelectionDebug('Syncing initial selected calendars', {
      initialSelectedCalendarIds,
      normalizedSelection,
    });
    setSelectedCalendarIds((previousIds) => {
      if (
        previousIds.length === normalizedSelection.length &&
        previousIds.every((calendarId, index) => calendarId === normalizedSelection[index])
      ) {
        return previousIds;
      }

      return normalizedSelection;
    });
  }, [normalizedInitialSelectionKey]);

  const loadCalendarList = useCallback(async () => {
    setIsCalendarListLoading(true);
    setCalendarListError(null);
    logCalendarSelectionDebug('Loading available calendars');

    const result = await fetchGoogleCalendarListAsync();
    setIsCalendarListLoading(false);

    if (result.type === 'error') {
      logCalendarSelectionDebug('Failed to load calendars', { message: result.message });
      setAvailableCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarListError(result.message);
      return;
    }

    logCalendarSelectionDebug('Loaded calendars successfully', {
      calendarCount: result.calendars.length,
      calendars: result.calendars.map((calendar) => ({
        id: calendar.id,
        name: calendar.name,
        isPrimary: calendar.isPrimary,
      })),
    });
    setAvailableCalendars(result.calendars);
    setSelectedCalendarIds((previousIds) => {
      const availableCalendarIds = new Set(result.calendars.map((calendar) => calendar.id));
      const retainedSelection = previousIds.filter((calendarId) =>
        availableCalendarIds.has(calendarId),
      );
      if (retainedSelection.length > 0) {
        logCalendarSelectionDebug('Retaining previous selected calendars', {
          previousIds,
          retainedSelection,
        });
        return retainedSelection;
      }

      const primaryCalendar = result.calendars.find((calendar) => calendar.isPrimary);
      const fallbackSelection = primaryCalendar ? [primaryCalendar.id] : [];
      logCalendarSelectionDebug('Defaulting selected calendar after load', {
        previousIds,
        fallbackSelection,
      });
      return fallbackSelection;
    });
  }, []);

  const handleToggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((previousIds) => {
      const nextIds = previousIds.includes(calendarId)
        ? previousIds.filter((id) => id !== calendarId)
        : [...previousIds, calendarId];
      logCalendarSelectionDebug('Toggled calendar selection', {
        calendarId,
        previousIds,
        nextIds,
      });
      return nextIds;
    });
  }, []);

  useEffect(() => {
    void loadCalendarList();
  }, [loadCalendarList]);

  return (
    <View style={calendarSelectionSliderStyles.container} testID="calendar-selection-slider">
      <View style={calendarSelectionSliderStyles.headerRow}>
        <Text testID="calendar-selection-title" style={calendarSelectionSliderStyles.titleText}>
          Select Calendars:
        </Text>
        <TouchableOpacity
          testID="close-calendar-selection-button"
          style={calendarSelectionSliderStyles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close calendar selection"
          onPress={onClose}
        >
          <Ionicons name="close" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={calendarSelectionSliderStyles.cardWrapper}>
        <CalendarSelectionCard
          calendars={availableCalendars}
          selectedCalendarIds={selectedCalendarIds}
          isLoading={isCalendarListLoading}
          errorMessage={calendarListError}
          onRetry={() => void loadCalendarList()}
          onToggleCalendar={handleToggleCalendar}
        />
      </View>

      <TouchableOpacity
        testID="calendar-selection-done-button"
        style={calendarSelectionSliderStyles.doneButton}
        onPress={() => {
          logCalendarSelectionDebug('Submitting selected calendars', {
            selectedCalendarIds,
          });
          onDone?.(selectedCalendarIds);
        }}
      >
        <Text style={calendarSelectionSliderStyles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}
