import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarSelectionCardStyles } from '../styles/CalendarSelectionCard.styles';
import { type GoogleCalendarListItem } from '../services/googleCalendarAuth';

type CalendarSelectionCardProps = {
  calendars: GoogleCalendarListItem[];
  activeCalendarId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectCalendar: (calendarId: string) => void;
};

export default function CalendarSelectionCard({
  calendars,
  activeCalendarId,
  isLoading,
  errorMessage,
  onRetry,
  onSelectCalendar,
}: Readonly<CalendarSelectionCardProps>) {
  const activeCalendarLabel = useMemo(
    () => calendars.find((calendar) => calendar.id === activeCalendarId)?.name ?? 'None',
    [activeCalendarId, calendars],
  );

  return (
    <View style={calendarSelectionCardStyles.card} testID="calendar-selection-card">
      <Text style={calendarSelectionCardStyles.title}>Select your calendar(s):</Text>

      {isLoading ? (
        <Text testID="calendar-list-loading" style={calendarSelectionCardStyles.infoText}>
          Loading calendars...
        </Text>
      ) : null}

      {!isLoading && errorMessage ? (
        <>
          <Text testID="calendar-list-error" style={calendarSelectionCardStyles.errorText}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            testID="retry-calendar-list-button"
            style={calendarSelectionCardStyles.retryButton}
            onPress={onRetry}
          >
            <Text style={calendarSelectionCardStyles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : null}

      {!isLoading && !errorMessage ? (
        <View style={calendarSelectionCardStyles.options}>
          {calendars.length === 0 ? (
            <Text testID="calendar-list-empty" style={calendarSelectionCardStyles.infoText}>
              No calendars were found on this account.
            </Text>
          ) : (
            calendars.map((calendar) => {
              const isSelected = activeCalendarId === calendar.id;
              return (
                <TouchableOpacity
                  key={calendar.id}
                  testID={`calendar-option-${calendar.id}`}
                  style={[
                    calendarSelectionCardStyles.option,
                    isSelected && calendarSelectionCardStyles.optionSelected,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onSelectCalendar(calendar.id)}
                >
                  <Ionicons
                    name={isSelected ? 'checkbox-outline' : 'square-outline'}
                    size={18}
                    color="#F5F1F2"
                  />
                  <Text style={calendarSelectionCardStyles.optionText}>{calendar.name}</Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      ) : null}

      <Text testID="active-calendar-label" style={calendarSelectionCardStyles.activeText}>
        Active Calendar: {activeCalendarLabel}
      </Text>
    </View>
  );
}
