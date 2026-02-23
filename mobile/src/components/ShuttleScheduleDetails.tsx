import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ShuttleSchedule from '../constants/shuttleSchedule';
import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import type { BuildingShape } from '../types/BuildingShape';
import type { ShuttleDirection, ShuttlePlan } from '../types/Shuttle';

type ShuttleScheduleDetailsProps = {
  startBuilding: BuildingShape | null;
  destinationBuilding: BuildingShape | null;
  shuttlePlan: ShuttlePlan | null;
  onBack: () => void;
  onClose: () => void;
};

const DEFAULT_UNAVAILABLE_MESSAGE = 'Shuttle bus unavailable today. Try Public Transit.';

const inferShuttleDirection = (
  startBuilding: BuildingShape | null,
  destinationBuilding: BuildingShape | null,
): ShuttleDirection => {
  if (startBuilding?.campus === 'LOYOLA' && destinationBuilding?.campus === 'SGW') {
    return 'LOYOLA_TO_SGW';
  }

  return 'SGW_TO_LOYOLA';
};

const getDayBucketFromDate = (date: Date): 'Monday-Thursday' | 'Friday' | null => {
  const day = date.getDay();
  if (day >= 1 && day <= 4) return 'Monday-Thursday';
  if (day === 5) return 'Friday';
  return null;
};

const parseScheduleTokenToMinutes = (token: string): number | null => {
  const [hourToken, minuteToken] = token.split(':');
  const hour = Number(hourToken);
  const minute = Number(minuteToken);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
};

export default function ShuttleScheduleDetails({
  startBuilding,
  destinationBuilding,
  shuttlePlan,
  onBack,
  onClose,
}: Readonly<ShuttleScheduleDetailsProps>) {
  const direction =
    shuttlePlan?.direction ?? inferShuttleDirection(startBuilding, destinationBuilding);
  const directionLabel = direction === 'LOYOLA_TO_SGW' ? 'LOY -> SGW' : 'SGW -> LOY';
  const scheduleCampusKey = direction === 'LOYOLA_TO_SGW' ? 'LOY' : 'SGW';
  const mondayThursdaySchedule = ShuttleSchedule.schedule['Monday-Thursday'][scheduleCampusKey];
  const fridaySchedule = ShuttleSchedule.schedule.Friday[scheduleCampusKey];
  const nearestDepartureDate = shuttlePlan?.nextDepartureDates?.[0] ?? null;
  const nearestDepartureBucket = nearestDepartureDate
    ? getDayBucketFromDate(nearestDepartureDate)
    : null;
  const nearestDepartureMinutes = nearestDepartureDate
    ? nearestDepartureDate.getHours() * 60 + nearestDepartureDate.getMinutes()
    : null;

  const isNearestScheduleTime = (
    dayBucket: 'Monday-Thursday' | 'Friday',
    scheduleToken: string,
  ) => {
    if (!nearestDepartureBucket || nearestDepartureMinutes === null) return false;
    if (dayBucket !== nearestDepartureBucket) return false;
    return parseScheduleTokenToMinutes(scheduleToken) === nearestDepartureMinutes;
  };

  return (
    <ScrollView
      testID="shuttle-schedule-details"
      style={directionDetailsStyles.contentScroll}
      contentContainerStyle={directionDetailsStyles.contentScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={directionDetailsStyles.header}>
        <View style={directionDetailsStyles.transitHeaderTextWrap}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              directionDetailsStyles.directionTitle,
              directionDetailsStyles.transitHeaderTitleText,
              directionDetailsStyles.shuttleScheduleHeaderTitle,
            ]}
          >
            Shuttle Schedule
          </Text>
          <Text numberOfLines={1} style={directionDetailsStyles.transitDestinationText}>
            {directionLabel}
          </Text>
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity
            testID="shuttle-schedule-back-button"
            style={directionDetailsStyles.iconButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="shuttle-schedule-close-button"
            style={directionDetailsStyles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={directionDetailsStyles.shuttleScheduleDetailsCard}>
        {shuttlePlan?.isServiceAvailable ? (
          <>
            <Text testID="shuttle-schedule-next-bus-text" style={directionDetailsStyles.shuttlePrimaryText}>
              {shuttlePlan.nextDepartureInMinutes === null
                ? 'Next bus time unavailable'
                : shuttlePlan.nextDepartureInMinutes <= 1
                  ? 'Next bus in 1 min'
                  : `Next bus in ${shuttlePlan.nextDepartureInMinutes} mins`}
            </Text>
            <Text style={directionDetailsStyles.shuttleDirectionText}>{directionLabel}</Text>
            <Text testID="shuttle-schedule-next-departures-text" style={directionDetailsStyles.shuttleSecondaryText}>
              Next departures: {shuttlePlan.nextDepartures.join(', ')}
            </Text>
          </>
        ) : (
          <Text testID="shuttle-schedule-unavailable-text" style={directionDetailsStyles.shuttleUnavailableText}>
            {shuttlePlan?.message ?? DEFAULT_UNAVAILABLE_MESSAGE}
          </Text>
        )}
      </View>

      <View
        testID="shuttle-schedule-full-content"
        style={directionDetailsStyles.shuttleScheduleFullContent}
      >
        <View style={directionDetailsStyles.shuttleScheduleDayCard}>
          <Text style={directionDetailsStyles.shuttleScheduleTitle}>Monday - Thursday</Text>
          <View testID="shuttle-schedule-mon-thu-text" style={directionDetailsStyles.shuttleScheduleTimesWrap}>
            {mondayThursdaySchedule.map((time, index) => (
              <View
                key={`shuttle-mon-thu-${time}-${index}`}
                testID={
                  isNearestScheduleTime('Monday-Thursday', time)
                    ? 'shuttle-nearest-time-chip'
                    : undefined
                }
                style={[
                  directionDetailsStyles.shuttleScheduleTimeChip,
                  isNearestScheduleTime('Monday-Thursday', time) &&
                    directionDetailsStyles.shuttleScheduleTimeChipHighlighted,
                ]}
              >
                <Text
                  style={[
                    directionDetailsStyles.shuttleScheduleTimeText,
                    isNearestScheduleTime('Monday-Thursday', time) &&
                      directionDetailsStyles.shuttleScheduleTimeTextHighlighted,
                  ]}
                >
                  {time}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={directionDetailsStyles.shuttleScheduleDayCard}>
          <Text style={directionDetailsStyles.shuttleScheduleTitle}>Friday</Text>
          <View testID="shuttle-schedule-friday-text" style={directionDetailsStyles.shuttleScheduleTimesWrap}>
            {fridaySchedule.map((time, index) => (
              <View
                key={`shuttle-friday-${time}-${index}`}
                testID={
                  isNearestScheduleTime('Friday', time) ? 'shuttle-nearest-time-chip' : undefined
                }
                style={[
                  directionDetailsStyles.shuttleScheduleTimeChip,
                  isNearestScheduleTime('Friday', time) &&
                    directionDetailsStyles.shuttleScheduleTimeChipHighlighted,
                ]}
              >
                <Text
                  style={[
                    directionDetailsStyles.shuttleScheduleTimeText,
                    isNearestScheduleTime('Friday', time) &&
                      directionDetailsStyles.shuttleScheduleTimeTextHighlighted,
                  ]}
                >
                  {time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
