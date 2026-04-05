//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useState } from 'react';
import { PanResponder, Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import { BuildingShape } from '../types/BuildingShape';
import type { RoutePlannerMode } from '../types/SheetMode';
import type { ShuttleDirection, ShuttlePlan } from '../types/Shuttle';
import type { UserCoords } from '../screens/MapScreen';
import { formatEta } from '../utils/directionsFormatting';

type DirectionDetailProps = {
  onClose: () => void;
  startBuilding: BuildingShape | null;
  destinationBuilding: BuildingShape | null;
  destinationLabel?: string | null;
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
  onTravelModeChange?: (mode: RoutePlannerMode) => void;
  selectedTravelMode?: RoutePlannerMode;
  shuttlePlan?: ShuttlePlan | null;
  canStartNavigation?: boolean;
  onPressTransitGo?: () => void;
  onPressGo?: (mode: RoutePlannerMode) => void;
  onPressShuttleSchedule?: () => void;
  onRetryRoute?: () => void;
  stageActionLabel?: string;
  onStageAction?: () => void;
  onSwapLocations?: () => void;
};

const SWAP_DRAG_THRESHOLD_PX = 14;

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

const SHUTTLE_UNAVAILABLE_MESSAGE = 'Shuttle bus unavailable today. Try Public Transit.';

const inferShuttleDirection = (
  startBuilding: BuildingShape | null,
  destinationBuilding: BuildingShape | null,
): ShuttleDirection | null => {
  const startCampus = startBuilding?.campus;
  const destinationCampus = destinationBuilding?.campus;

  if (startCampus === 'SGW' && destinationCampus === 'LOYOLA') return 'SGW_TO_LOYOLA';
  if (startCampus === 'LOYOLA' && destinationCampus === 'SGW') return 'LOYOLA_TO_SGW';
  return null;
};

const getShuttleDirectionLabel = (direction: ShuttleDirection | null) =>
  direction === 'LOYOLA_TO_SGW' ? 'LOY -> SGW' : 'SGW -> LOY';

const getShuttleDepartureSummary = (nextDepartureInMinutes: number | null) => {
  if (nextDepartureInMinutes === null) return null;
  if (nextDepartureInMinutes <= 1) return 'Next bus in 1 min';
  return `Next bus in ${nextDepartureInMinutes} mins`;
};

const ScheduleMenuButton = ({
  onPress,
}: Readonly<{
  onPress?: () => void;
}>) => (
  <TouchableOpacity
    testID="shuttle-full-schedule-button"
    onPress={onPress}
    style={directionDetailsStyles.shuttleScheduleButton}
  >
    <View style={directionDetailsStyles.shuttleScheduleIcon}>
      <View style={directionDetailsStyles.shuttleScheduleIconRow}>
        <View style={directionDetailsStyles.shuttleScheduleDot} />
        <View style={directionDetailsStyles.shuttleScheduleLine} />
      </View>
      <View style={directionDetailsStyles.shuttleScheduleIconRow}>
        <View style={directionDetailsStyles.shuttleScheduleDot} />
        <View style={directionDetailsStyles.shuttleScheduleLine} />
      </View>
      <View style={directionDetailsStyles.shuttleScheduleIconRow}>
        <View style={directionDetailsStyles.shuttleScheduleDot} />
        <View style={directionDetailsStyles.shuttleScheduleLine} />
      </View>
    </View>
  </TouchableOpacity>
);

const ShuttleUnavailableCard = ({
  message,
  scheduleMenuButton,
}: Readonly<{
  message: string;
  scheduleMenuButton: React.ReactNode;
}>) => (
  <View style={directionDetailsStyles.shuttleUnavailableCard}>
    <View style={directionDetailsStyles.shuttleUnavailableRow}>
      <View style={directionDetailsStyles.shuttleUnavailableIconWrap}>
        <Ionicons name="alert-circle-outline" size={18} color="#F4C15B" />
      </View>
      <View style={directionDetailsStyles.shuttleUnavailableTextWrap}>
        <Text style={directionDetailsStyles.shuttleUnavailableTitle}>Shuttle Unavailable</Text>
        <Text
          testID="shuttle-unavailable-text"
          style={directionDetailsStyles.shuttleUnavailableText}
        >
          {message}
        </Text>
      </View>
      <View style={directionDetailsStyles.shuttleUnavailableButtonWrap}>{scheduleMenuButton}</View>
    </View>
  </View>
);

const renderShuttleCardBody = ({
  isCrossCampusRoute,
  shuttlePlan,
  shuttleDepartureSummary,
  shuttleDirectionLabel,
  scheduleMenuButton,
}: {
  isCrossCampusRoute: boolean;
  shuttlePlan: ShuttlePlan | null;
  shuttleDepartureSummary: string | null;
  shuttleDirectionLabel: string;
  scheduleMenuButton: React.ReactNode;
}) => {
  if (!shuttlePlan) {
    if (isCrossCampusRoute) {
      return (
        <>
          <View style={directionDetailsStyles.shuttleCardTopRow}>
            <View style={directionDetailsStyles.shuttleHeaderSpacer} />
            {scheduleMenuButton}
          </View>
          <Text testID="shuttle-loading-text" style={directionDetailsStyles.routeMetaText}>
            Loading shuttle schedule...
          </Text>
        </>
      );
    }

    return (
      <ShuttleUnavailableCard
        message={SHUTTLE_UNAVAILABLE_MESSAGE}
        scheduleMenuButton={scheduleMenuButton}
      />
    );
  }

  if (shuttlePlan.isServiceAvailable) {
    return (
      <>
        <View style={directionDetailsStyles.shuttleCardTopRow}>
          <Text testID="shuttle-next-bus-text" style={directionDetailsStyles.shuttlePrimaryText}>
            {shuttleDepartureSummary ?? 'Next bus time unavailable'}
          </Text>
          {scheduleMenuButton}
        </View>
        <Text testID="shuttle-direction-label" style={directionDetailsStyles.shuttleDirectionText}>
          {shuttleDirectionLabel}
        </Text>
      </>
    );
  }

  return (
    <ShuttleUnavailableCard
      message={shuttlePlan.message ?? SHUTTLE_UNAVAILABLE_MESSAGE}
      scheduleMenuButton={scheduleMenuButton}
    />
  );
};

const renderRouteMetaBody = ({
  isRouteLoading,
  routeErrorMessage,
  hasRouteSummary,
  routeDurationText,
  routeDistanceText,
  routeEtaText,
  isCrossCampusRoute,
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
  isCrossCampusRoute: boolean;
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
          adjustsFontSizeToFit
          minimumFontScale={0.72}
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
          {isCrossCampusRoute ? (
            <>
              <Text style={directionDetailsStyles.routeSecondaryText}> - </Text>
              <View style={directionDetailsStyles.crossCampusContainer}>
                <Text testID="cross-campus-label" style={directionDetailsStyles.crossCampusText}>
                  Cross-Campus
                </Text>
              </View>
            </>
          ) : null}
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

export default function DirectionDetails({
  startBuilding,
  destinationBuilding,
  destinationLabel = null,
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
  selectedTravelMode,
  shuttlePlan = null,
  canStartNavigation = true,
  onPressTransitGo,
  onPressGo,
  onPressShuttleSchedule,
  onRetryRoute,
  stageActionLabel,
  onStageAction,
  onSwapLocations,
}: Readonly<DirectionDetailProps>) {
  const [activeMode, setActiveMode] = useState<RoutePlannerMode>(selectedTravelMode ?? 'walking');
  const didSwapOnDragRef = React.useRef(false);
  const isSelected = (mode: RoutePlannerMode) => activeMode === mode;
  const isTransitSelected = isSelected('transit');
  const isShuttleSelected = isSelected('shuttle');
  const showShuttleCard = isShuttleSelected;
  const hasRouteSummary = Boolean(routeDistanceText && routeDurationText);
  const showGoButton = hasRouteSummary && (isTransitSelected || canStartNavigation);
  const canPressGo = showGoButton && !isRouteLoading && !routeErrorMessage;

  React.useEffect(() => {
    if (!selectedTravelMode) return;
    setActiveMode(selectedTravelMode);
  }, [selectedTravelMode]);

  const handleSelectMode = (mode: RoutePlannerMode) => {
    setActiveMode(mode);
    onTravelModeChange?.(mode);
  };

  const handlePressGo = () => {
    const selectedMode: RoutePlannerMode = activeMode;
    const isNavigationMode = selectedMode === 'walking' || selectedMode === 'driving';

    if (!canPressGo) return;
    if (isNavigationMode && !canStartNavigation) return;

    if (selectedMode === 'transit' && !onPressGo) {
      onPressTransitGo?.();
      return;
    }

    onPressGo?.(selectedMode);
  };

  const startDisplayText = getStartDisplayText(startBuilding, currentBuilding, userLocation);
  const resolvedDestinationLabel =
    destinationLabel ?? destinationBuilding?.name ?? 'Set destination';
  const canSwapLocations =
    Boolean(onSwapLocations) &&
    startDisplayText !== 'Set as starting point' &&
    resolvedDestinationLabel !== 'Set destination';
  const triggerSwap = React.useCallback(() => {
    if (!canSwapLocations) return;
    onSwapLocations?.();
  }, [canSwapLocations, onSwapLocations]);

  const handleSwapPress = React.useCallback(() => {
    if (!canSwapLocations) return;
    if (didSwapOnDragRef.current) {
      didSwapOnDragRef.current = false;
      return;
    }
    onSwapLocations?.();
  }, [canSwapLocations, onSwapLocations]);

  const swapLocationPanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          canSwapLocations &&
          Math.abs(gestureState.dy) > 4 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          didSwapOnDragRef.current = false;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (!canSwapLocations) return;
          if (Math.abs(gestureState.dy) < SWAP_DRAG_THRESHOLD_PX) return;
          didSwapOnDragRef.current = true;
          triggerSwap();
        },
        onPanResponderTerminate: (_event, gestureState) => {
          if (!canSwapLocations) return;
          if (Math.abs(gestureState.dy) < SWAP_DRAG_THRESHOLD_PX) return;
          didSwapOnDragRef.current = true;
          triggerSwap();
        },
      }),
    [canSwapLocations, triggerSwap],
  );
  const routeEtaText = formatEta(routeDurationSeconds);
  const nextDepartureInMinutes = shuttlePlan?.nextDepartureInMinutes ?? null;
  const effectiveDirection =
    shuttlePlan?.direction ?? inferShuttleDirection(startBuilding, destinationBuilding);
  const shuttleDirectionLabel = getShuttleDirectionLabel(effectiveDirection);
  const shuttleDepartureSummary = getShuttleDepartureSummary(nextDepartureInMinutes);
  const scheduleMenuButton = <ScheduleMenuButton onPress={onPressShuttleSchedule} />;

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
                {resolvedDestinationLabel}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={directionDetailsStyles.subLocationHeader}>
            <TouchableOpacity
              testID="destination-location-drag-handle"
              accessibilityRole="button"
              accessibilityLabel="Reorder locations"
              accessibilityHint="Drag up or down to swap start and destination"
              accessibilityState={{ disabled: !canSwapLocations }}
              disabled={!canSwapLocations}
              activeOpacity={canSwapLocations ? 0.72 : 1}
              onPress={handleSwapPress}
              style={directionDetailsStyles.dragHandleTouchTarget}
              {...(canSwapLocations ? swapLocationPanResponder.panHandlers : {})}
            >
              <Ionicons name="swap-vertical" size={20} style={directionDetailsStyles.dragIcon} />
            </TouchableOpacity>
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
            accessibilityState={{ selected: isSelected('driving') }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected('driving') && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => handleSelectMode('driving')}
          >
            <Ionicons
              name="car-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-bus"
            accessibilityState={{ selected: isSelected('transit') }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected('transit') && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => handleSelectMode('transit')}
          >
            <Ionicons
              name="train-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-shuttle"
            accessibilityState={{ selected: isSelected('shuttle') }}
            style={[
              directionDetailsStyles.transportationButton,
              isSelected('shuttle') && directionDetailsStyles.activeTransportationButton,
            ]}
            onPress={() => handleSelectMode('shuttle')}
          >
            <Ionicons
              name="bus-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
      {showShuttleCard ? (
        <View testID="shuttle-card-content" style={directionDetailsStyles.shuttleCardMetaContainer}>
          <View style={directionDetailsStyles.shuttleCardContainer}>
            {renderShuttleCardBody({
              isCrossCampusRoute,
              shuttlePlan,
              shuttleDepartureSummary,
              shuttleDirectionLabel,
              scheduleMenuButton,
            })}
          </View>
        </View>
      ) : null}
      {isShuttleSelected ? null : (
        <View style={directionDetailsStyles.routeMetaContainer}>
          {renderRouteMetaBody({
            isRouteLoading,
            routeErrorMessage,
            hasRouteSummary,
            routeDurationText,
            routeDistanceText,
            routeEtaText,
            isCrossCampusRoute,
            showGoButton,
            canPressGo,
            handlePressGo,
            onRetryRoute,
          })}
        </View>
      )}
      {stageActionLabel && onStageAction ? (
        <TouchableOpacity
          testID="route-stage-action-button"
          activeOpacity={0.88}
          onPress={onStageAction}
          style={directionDetailsStyles.stageActionButton}
        >
          <Text style={directionDetailsStyles.stageActionButtonText}>{stageActionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}
