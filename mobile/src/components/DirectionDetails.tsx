//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import { BuildingShape } from '../types/BuildingShape';
import type { DirectionsTravelMode } from '../types/Directions';
import type { UserCoords } from '../screens/MapScreen';
import { formatEta } from '../utils/directionsFormatting';

type DirectionDetailProps = {
  onClose: () => void;
  startBuilding: BuildingShape | null;
  destinationBuilding: BuildingShape | null;
  userLocation: UserCoords | null;
  currentBuilding: BuildingShape | null;
  isCrossCampusRoute?: boolean;
  isRouteLoading?: boolean;
  routeErrorMessage?: string | null;
  routeDistanceText?: string | null;
  routeDurationText?: string | null;
  routeDurationSeconds?: number | null;
  onPressStart?: () => void;
  onPressDestination?: () => void;
  onTravelModeChange?: (mode: DirectionsTravelMode) => void;
};

/**
 * Helper to determine what to display as the start location.
 * Priority: currentBuilding (user is in a building) > userLocation available > "Set as starting point"
 */
const getStartDisplayText = (
  startBuilding: BuildingShape | null,
  currentBuilding: BuildingShape | null,
  userLocation: UserCoords | null,
): string => {
  if (startBuilding?.name) return startBuilding.name;
  if (currentBuilding?.name) return `${currentBuilding.name} (My Location)`;
  if (userLocation) return 'My Location';
  else return 'Set as starting point';
};

export default function DirectionDetails({
  startBuilding,
  destinationBuilding,
  onClose,
  userLocation,
  currentBuilding,
  isCrossCampusRoute = false,
  isRouteLoading = false,
  routeErrorMessage = null,
  routeDistanceText = null,
  routeDurationText = null,
  routeDurationSeconds = null,
  onPressStart,
  onPressDestination,
  onTravelModeChange,
}: Readonly<DirectionDetailProps>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isSelected = (index: number) => activeIndex === index;

  const handleSelectWalk = () => {
    setActiveIndex(0);
    onTravelModeChange?.('walking');
  };

  const handleSelectCar = () => {
    setActiveIndex(1);
    onTravelModeChange?.('driving');
  };

  const startDisplayText = getStartDisplayText(startBuilding, currentBuilding, userLocation);
  const routeEtaText = formatEta(routeDurationSeconds);

  return (
    <>
      <View style={directionDetailsStyles.header}>
        <View>
          <Text style={directionDetailsStyles.directionTitle}> Directions </Text>
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity
            testID="directions-close-button"
            style={directionDetailsStyles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={directionDetailsStyles.locationHeader}>
        <View style={directionDetailsStyles.header}>
          <View style={directionDetailsStyles.inlineHeader}>
            <Ionicons name="navigate" size={20} style={directionDetailsStyles.frontIcon} />
            <TouchableOpacity
              testID="start-location-button"
              style={directionDetailsStyles.locationButton}
              onPress={onPressStart}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, color: 'white' }}>
                {startDisplayText}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={directionDetailsStyles.subLocationHeader}>
            <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
          </View>
        </View>
        <View style={directionDetailsStyles.separationHeader}>
          <Ionicons name="ellipsis-vertical" size={20} style={directionDetailsStyles.dragIcon} />
          <Divider
            style={{ backgroundColor: '#9B9B9B', height: 1.5, flex: 1, alignSelf: 'center' }}
          />
        </View>
        <View style={directionDetailsStyles.header}>
          <View style={directionDetailsStyles.inlineHeader}>
            <Ionicons name="location-outline" size={20} style={directionDetailsStyles.frontIcon} />
            <TouchableOpacity
              testID="destination-location-button"
              style={directionDetailsStyles.locationButton}
              onPress={onPressDestination}
            >
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, color: 'white' }}>
                {destinationBuilding?.name ?? 'Set destination'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={directionDetailsStyles.subLocationHeader}>
            <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
          </View>
        </View>
      </View>
      <View style={directionDetailsStyles.transportationHeader}>
        <View style={directionDetailsStyles.transportationSubHeader}>
          <TouchableOpacity
            testID="transport-walk"
            accessibilityState={{ selected: isSelected(0) }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected(0) && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={handleSelectWalk}
          >
            <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-car"
            accessibilityState={{ selected: isSelected(1) }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected(1) && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={handleSelectCar}
          >
            <Ionicons
              name="car-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-bus"
            accessibilityState={{ selected: isSelected(2) }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected(2) && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => setActiveIndex(2)}
          >
            <Ionicons
              name="bus-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
      <View style={directionDetailsStyles.routeMetaContainer}>
        {isRouteLoading ? (
          <Text testID="route-loading-text" style={directionDetailsStyles.routeMetaText}>
            Loading route...
          </Text>
        ) : routeErrorMessage ? (
          <Text testID="route-error-text" style={directionDetailsStyles.routeErrorText}>
            {routeErrorMessage}
          </Text>
        ) : routeDistanceText && routeDurationText ? (
          <View style={directionDetailsStyles.routeSummaryRow}>
            <View style={directionDetailsStyles.routeSummaryTextWrap}>
              <Text
                testID="route-summary-text"
                numberOfLines={1}
                style={directionDetailsStyles.routePrimaryText}
              >
                {routeDurationText}
              </Text>
              <View style={directionDetailsStyles.routeSecondaryInlineRow}>
                <Text
                  testID="route-secondary-text"
                  numberOfLines={1}
                  style={directionDetailsStyles.routeSecondaryText}
                >
                  {routeEtaText ? `${routeEtaText} ETA • ${routeDistanceText}` : routeDistanceText}
                </Text>
                {isCrossCampusRoute && (
                  <>
                    <Text style={directionDetailsStyles.routeSecondaryText}> • </Text>
                    <View style={directionDetailsStyles.crossCampusContainer}>
                      <Text
                        testID="cross-campus-label"
                        style={directionDetailsStyles.crossCampusText}
                      >
                        Cross-Campus
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
            <TouchableOpacity
              testID="route-go-button"
              disabled={true}
              activeOpacity={1}
              style={directionDetailsStyles.routeGoButton}
            >
              <Text style={directionDetailsStyles.routeGoText}>GO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text testID="route-empty-text" style={directionDetailsStyles.routeMetaText}>
            Select start and destination to view route details.
          </Text>
        )}
      </View>
    </>
  );
}
