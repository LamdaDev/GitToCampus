import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import type { TransitInstruction } from '../types/Directions';
import type { BuildingShape } from '../types/BuildingShape';

type TransitPlanDetailsProps = {
  destinationBuilding: BuildingShape | null;
  routeTransitSteps: TransitInstruction[];
  onBack: () => void;
  onClose: () => void;
};

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const getSafeHexColor = (color: string | null | undefined, fallback: string) => {
  if (!color) return fallback;
  return HEX_COLOR_PATTERN.test(color) ? color : fallback;
};

const getTransitIconName = (
  step: TransitInstruction,
): React.ComponentProps<typeof Ionicons>['name'] => {
  if (step.type === 'walk') return 'walk-outline';
  switch ((step.vehicleType ?? '').toUpperCase()) {
    case 'SUBWAY':
    case 'HEAVY_RAIL':
    case 'METRO_RAIL':
      return 'subway-outline';
    case 'TRAM':
    case 'RAIL':
      return 'train-outline';
    case 'BUS':
    default:
      return 'bus-outline';
  }
};

export default function TransitPlanDetails({
  destinationBuilding,
  routeTransitSteps,
  onBack,
  onClose,
}: Readonly<TransitPlanDetailsProps>) {
  return (
    <ScrollView
      style={directionDetailsStyles.contentScroll}
      contentContainerStyle={directionDetailsStyles.contentScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={directionDetailsStyles.header}>
        <View style={directionDetailsStyles.transitHeaderTextWrap}>
          <Text style={directionDetailsStyles.directionTitle}>Public Transit</Text>
          {destinationBuilding?.name ? (
            <Text numberOfLines={1} style={directionDetailsStyles.transitDestinationText}>
              {destinationBuilding.name}
            </Text>
          ) : null}
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity
            testID="transit-back-button"
            style={directionDetailsStyles.iconButton}
            onPress={onBack}
          >
            <Ionicons name="arrow-back" size={21} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transit-close-button"
            style={directionDetailsStyles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View testID="transit-itinerary-container" style={directionDetailsStyles.transitContainer}>
      
        {routeTransitSteps.length === 0 ? (
          <Text testID="transit-empty-text" style={directionDetailsStyles.transitEmptyText}>
            Transit step details are currently unavailable for this route.
          </Text>
        ) : (
          routeTransitSteps.map((step, index) => {
            const badgeBackground = getSafeHexColor(step.lineColor, '#198BEB');
            const badgeTextColor = getSafeHexColor(step.lineTextColor, '#FFFFFF');
            const stopSummary =
              step.departureStopName && step.arrivalStopName
                ? `${step.departureStopName} -> ${step.arrivalStopName}`
                : (step.departureStopName ?? step.arrivalStopName ?? null);

            return (
              <View
                key={step.id}
                testID={`transit-step-${index}`}
                style={[
                  directionDetailsStyles.transitStepRow,
                  index > 0 && directionDetailsStyles.transitStepRowWithDivider,
                ]}
              >
                {step.type === 'transit' && step.lineShortName ? (
                  <View
                    style={[
                      directionDetailsStyles.transitLineBadge,
                      { backgroundColor: badgeBackground },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        directionDetailsStyles.transitLineBadgeText,
                        { color: badgeTextColor },
                      ]}
                    >
                      {step.lineShortName}
                    </Text>
                  </View>
                ) : (
                  <View style={directionDetailsStyles.transitIconBadge}>
                    <Ionicons name={getTransitIconName(step)} size={18} color="#FFFFFF" />
                  </View>
                )}
                <View style={directionDetailsStyles.transitStepBody}>
                  <Text style={directionDetailsStyles.transitStepTitle}>{step.title}</Text>
                  {step.subtitle ? (
                    <Text style={directionDetailsStyles.transitStepSubtitle}>{step.subtitle}</Text>
                  ) : null}
                  {step.detail ? (
                    <Text style={directionDetailsStyles.transitStepDetail}>{step.detail}</Text>
                  ) : null}
                  {stopSummary ? (
                    <Text style={directionDetailsStyles.transitStepStopText}>{stopSummary}</Text>
                  ) : null}
                  {step.departureTimeText || step.arrivalTimeText ? (
                    <View style={directionDetailsStyles.transitTimeRow}>
                      {step.departureTimeText ? (
                        <Text style={directionDetailsStyles.transitStepTimeText}>
                          Departs {step.departureTimeText}
                        </Text>
                      ) : null}
                      {step.arrivalTimeText ? (
                        <Text style={directionDetailsStyles.transitStepTimeText}>
                          Arrives {step.arrivalTimeText}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
