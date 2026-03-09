import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarSelectionCard from './CalendarSelectionCard';
import { calendarSelectionSliderStyles } from '../styles/CalendarSelectionSlider.styles';
import {
  fetchGoogleCalendarListAsync,
  type GoogleCalendarListItem,
} from '../services/googleCalendarAuth';

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

    const result = await fetchGoogleCalendarListAsync();
    setIsCalendarListLoading(false);

    if (result.type === 'error') {
      setAvailableCalendars([]);
      setSelectedCalendarIds([]);
      setCalendarListError(result.message);
      return;
    }

    setAvailableCalendars(result.calendars);
    setSelectedCalendarIds((previousIds) => {
      const availableCalendarIds = new Set(result.calendars.map((calendar) => calendar.id));
      const retainedSelection = previousIds.filter((calendarId) =>
        availableCalendarIds.has(calendarId),
      );
      if (retainedSelection.length > 0) {
        return retainedSelection;
      }

      const primaryCalendar = result.calendars.find((calendar) => calendar.isPrimary);
      const fallbackSelection = primaryCalendar ? [primaryCalendar.id] : [];
      return fallbackSelection;
    });
  }, []);

  const handleToggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds((previousIds) => {
      const nextIds = previousIds.includes(calendarId)
        ? previousIds.filter((id) => id !== calendarId)
        : [...previousIds, calendarId];
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
        onPress={() => onDone?.(selectedCalendarIds)}
      >
        <Text style={calendarSelectionSliderStyles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}
