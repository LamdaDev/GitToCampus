import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import CalendarSelectionCard from './CalendarSelectionCard';
import { calendarSelectionSliderStyles } from '../styles/CalendarSelectionSlider.styles';
import {
  fetchGoogleCalendarListAsync,
  type GoogleCalendarListItem,
} from '../services/googleCalendarAuth';

type CalendarSelectionSliderProps = {
  onDone?: () => void;
};

export default function CalendarSelectionSlider({
  onDone,
}: Readonly<CalendarSelectionSliderProps>) {
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [isCalendarListLoading, setIsCalendarListLoading] = useState(false);
  const [calendarListError, setCalendarListError] = useState<string | null>(null);
  const [activeCalendarId, setActiveCalendarId] = useState<string | null>(null);

  const loadCalendarList = useCallback(async () => {
    setIsCalendarListLoading(true);
    setCalendarListError(null);

    const result = await fetchGoogleCalendarListAsync();
    setIsCalendarListLoading(false);

    if (result.type === 'error') {
      setAvailableCalendars([]);
      setActiveCalendarId(null);
      setCalendarListError(result.message);
      return;
    }

    setAvailableCalendars(result.calendars);
    setActiveCalendarId((previousId) => {
      if (previousId && result.calendars.some((calendar) => calendar.id === previousId)) {
        return previousId;
      }

      const primaryCalendar = result.calendars.find((calendar) => calendar.isPrimary);
      return primaryCalendar?.id ?? result.calendars[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void loadCalendarList();
  }, [loadCalendarList]);

  return (
    <View style={calendarSelectionSliderStyles.container} testID="calendar-selection-slider">
      <CalendarSelectionCard
        calendars={availableCalendars}
        activeCalendarId={activeCalendarId}
        isLoading={isCalendarListLoading}
        errorMessage={calendarListError}
        onRetry={() => void loadCalendarList()}
        onSelectCalendar={setActiveCalendarId}
      />

      <TouchableOpacity
        testID="calendar-selection-done-button"
        style={calendarSelectionSliderStyles.doneButton}
        onPress={onDone}
      >
        <Text style={calendarSelectionSliderStyles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}
