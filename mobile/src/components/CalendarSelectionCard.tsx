import React, { useMemo } from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calendarSelectionCardStyles } from '../styles/CalendarSelectionCard.styles';
import { type GoogleCalendarListItem } from '../services/googleCalendarAuth';

type CalendarSelectionCardProps = {
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: string[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onToggleCalendar: (calendarId: string) => void;
};

export default function CalendarSelectionCard({
  calendars,
  selectedCalendarIds,
  isLoading,
  errorMessage,
  onRetry,
  onToggleCalendar,
}: Readonly<CalendarSelectionCardProps>) {
  const selectedCalendarIdSet = useMemo(() => new Set(selectedCalendarIds), [selectedCalendarIds]);
  const shouldShowCalendarListScroll = calendars.length > 6;

  return (
    <View style={calendarSelectionCardStyles.card} testID="calendar-selection-card">
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
            <FlatList<GoogleCalendarListItem>
              testID="calendar-options-list"
              data={calendars}
              keyExtractor={(calendar) => calendar.id}
              nestedScrollEnabled={true}
              scrollEnabled={shouldShowCalendarListScroll}
              showsVerticalScrollIndicator={shouldShowCalendarListScroll}
              style={calendarSelectionCardStyles.optionsList}
              contentContainerStyle={calendarSelectionCardStyles.optionsListContent}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={calendarSelectionCardStyles.optionGap} />}
              renderItem={({ item: calendar }) => {
                const isSelected = selectedCalendarIdSet.has(calendar.id);
                return (
                  <TouchableOpacity
                    testID={`calendar-option-${calendar.id}`}
                    style={[
                      calendarSelectionCardStyles.option,
                      isSelected && calendarSelectionCardStyles.optionSelected,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onToggleCalendar(calendar.id)}
                  >
                    <Ionicons
                      name={isSelected ? 'checkbox-outline' : 'square-outline'}
                      size={18}
                      color="#F5F1F2"
                    />
                    <Text style={calendarSelectionCardStyles.optionText}>{calendar.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
