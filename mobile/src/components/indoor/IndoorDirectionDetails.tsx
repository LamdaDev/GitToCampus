import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../../styles/DirectionDetails.styles';
import type { IndoorRoutePlannerMode } from '../../types/SheetMode';

type DirectionDetailProps = {
  onClose: () => void;
  startRoom: string | null;
  destinationRoom: string | null;
  isRouteLoading?: boolean;
  routeErrorMessage?: string | null;
  routeDistanceText?: string | null;
  routeAdditionalText?: string | null;
  onPressStart?: () => void;
  onPressDestination?: () => void;
  onTravelModeChange?: (mode: IndoorRoutePlannerMode) => void;
  selectedTravelMode?: IndoorRoutePlannerMode;
  canStartNavigation?: boolean;
  onPressTransitGo?: () => void;
  onPressGo?: (mode: IndoorRoutePlannerMode) => void;
};

const getStartDisplayText = (startRoom: string | null): string => {
  if (startRoom != null) return startRoom;
  else return 'Set as starting point';
};

const renderRouteMetaBody = ({
  isRouteLoading,
  routeErrorMessage,
  hasRouteSummary,
  routeDurationText,
  routeDistanceText,
  routeEtaText,
  showGoButton,
  canPressGo,
  handlePressGo,
  onRetryRoute,
}: {
  isRouteLoading: boolean;
  routeErrorMessage: string | null;
  hasRouteSummary: boolean;
  routeDurationText: string | null;
  routeDistanceText: string | null;
  routeEtaText: string | null;
  showGoButton: boolean;
  canPressGo: boolean;
  handlePressGo: () => void;
  onRetryRoute?: () => void;
}) => {
  if (isRouteLoading) {
    return (
      <Text testID="route-loading-text" style={directionDetailsStyles.routeMetaText}>
        Loading route...
      </Text>
    );
  }

  if (routeErrorMessage) {
    return (
      <View>
        <Text testID="route-error-text" style={directionDetailsStyles.routeErrorText}>
          {routeErrorMessage}
        </Text>
        <TouchableOpacity
          testID="route-retry-button"
          style={directionDetailsStyles.routeRetryButton}
          onPress={onRetryRoute}
        >
          <Text style={directionDetailsStyles.routeRetryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasRouteSummary) {
    return (
      <Text testID="route-empty-text" style={directionDetailsStyles.routeMetaText}>
        Select start and destination to view route details.
      </Text>
    );
  }

  const routeSecondaryText = routeEtaText
    ? `${routeEtaText} ETA - ${routeDistanceText}`
    : routeDistanceText;

  return (
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
            {routeSecondaryText}
          </Text>
        </View>
      </View>
      {showGoButton ? (
        <TouchableOpacity
          testID="route-go-button"
          disabled={!canPressGo}
          activeOpacity={canPressGo ? 0.85 : 1}
          onPress={handlePressGo}
          style={[
            directionDetailsStyles.routeGoButton,
            !canPressGo && directionDetailsStyles.routeGoButtonDisabled,
          ]}
        >
          <Text style={directionDetailsStyles.routeGoText}>GO</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

export default function IndoorDirectionDetails({
  onClose,
  startRoom,
  destinationRoom,
  isRouteLoading,
  routeErrorMessage,
  routeDistanceText,
  routeAdditionalText,
  onPressStart,
  onPressDestination,
  selectedTravelMode,
  onTravelModeChange,
  canStartNavigation,
  onPressTransitGo,
  onPressGo,
}: Readonly<DirectionDetailProps>) {
  const [activeMode, setActiveMode] = useState<IndoorRoutePlannerMode>(
    selectedTravelMode ?? 'walking',
  );
  const isSelected = (mode: IndoorRoutePlannerMode) => activeMode === mode;
  const hasRouteSummary = Boolean(routeDistanceText && routeAdditionalText);
  const showGoButton = hasRouteSummary && canStartNavigation;
  const canPressGo = showGoButton && !isRouteLoading && !routeErrorMessage;

  React.useEffect(() => {
    if (!selectedTravelMode) return;
    setActiveMode(selectedTravelMode);
  }, [selectedTravelMode]);

  const handleSelectMode = (mode: IndoorRoutePlannerMode) => {
    setActiveMode(mode);
    onTravelModeChange?.(mode);
  };

  const handlePressGo = () => {
    const selectedMode: IndoorRoutePlannerMode = activeMode;
    const isNavigationMode = selectedMode === 'walking' || selectedMode === 'disability';

    if (!canPressGo) return;
    if (isNavigationMode && !canStartNavigation) return;

    onPressGo?.(selectedMode);
  };

  const startDisplayText = getStartDisplayText(startRoom);

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
                {destinationRoom ?? 'Set destination'}
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
            accessibilityState={{ selected: isSelected('walking') }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected('walking') && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => handleSelectMode('walking')}
          >
            <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-car"
            accessibilityState={{ selected: isSelected('disability') }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected('disability') && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => handleSelectMode('disability')}
          >
            <FontAwesome
              name="wheelchair"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/*
      <View style={directionDetailsStyles.routeMetaContainer}>
        {renderRouteMetaBody({
            isRouteLoading,
            routeErrorMessage,
            hasRouteSummary,
            routeDurationText,
            routeDistanceText,
            routeEtaText,
            showGoButton,
            canPressGo,
            handlePressGo,
            onRetryRoute,
        })}
      </View>
      */}
    </>
  );
}
