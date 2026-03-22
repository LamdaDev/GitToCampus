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
  onPressStart?: () => void;
  onPressDestination?: () => void;
  onTravelModeChange?: (mode: IndoorRoutePlannerMode) => void;
  selectedTravelMode?: IndoorRoutePlannerMode;
  onPressGo?: () => void;
  hasPath?: boolean;
  onClear?: () => void;
};

const getDisplayText = (value: string | null, fallback: string) => value ?? fallback;

const LocationRow = ({
  icon,
  text,
  testID,
  onPress,
}: {
  icon: string;
  text: string;
  testID: string;
  onPress?: () => void;
}) => (
  <View style={directionDetailsStyles.header}>
    <View style={directionDetailsStyles.inlineHeader}>
      <Ionicons name={icon as any} size={20} style={directionDetailsStyles.frontIcon} />
      <TouchableOpacity
        testID={testID}
        style={directionDetailsStyles.locationButton}
        onPress={onPress}
      >
        <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, color: 'white' }}>
          {text}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={directionDetailsStyles.subLocationHeader}>
      <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
    </View>
  </View>
);

const TransportButton = ({
  mode,
  activeMode,
  icon,
  onPress,
  testID,
}: {
  mode: IndoorRoutePlannerMode;
  activeMode: IndoorRoutePlannerMode;
  icon: React.ReactNode;
  onPress: () => void;
  testID: string;
}) => {
  const isActive = activeMode === mode;

  return (
    <TouchableOpacity
      testID={testID}
      accessibilityState={{ selected: isActive }}
      style={[
        directionDetailsStyles.transportationButton,
        isActive && directionDetailsStyles.activeTransportationButton,
      ]}
      onPress={onPress}
    >
      {icon}
    </TouchableOpacity>
  );
};

export default function IndoorDirectionDetails({
  onClose,
  startRoom,
  destinationRoom,
  onPressStart,
  onPressDestination,
  selectedTravelMode,
  onTravelModeChange,
  onPressGo,
  hasPath,
  onClear,
}: Readonly<DirectionDetailProps>) {
  const [activeMode, setActiveMode] = useState<IndoorRoutePlannerMode>(
    selectedTravelMode ?? 'walking',
  );

  React.useEffect(() => {
    if (selectedTravelMode) setActiveMode(selectedTravelMode);
  }, [selectedTravelMode]);

  const handleSelectMode = (mode: IndoorRoutePlannerMode) => {
    setActiveMode(mode);
    onTravelModeChange?.(mode);
  };

  return (
    <>
      <View style={directionDetailsStyles.header}>
        <View>
          <Text style={directionDetailsStyles.directionTitle}> Directions </Text>
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity
            testID="clear-button"
            style={directionDetailsStyles.iconButton}
            onPress={onClear}
          >
            <Ionicons name="close-sharp" size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            testID="directions-close-button"
            style={directionDetailsStyles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="chevron-down-outline" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={directionDetailsStyles.locationHeader}>
        <LocationRow
          icon="navigate"
          text={getDisplayText(startRoom, 'Set as starting point')}
          testID="start-location-button"
          onPress={onPressStart}
        />

        <View style={directionDetailsStyles.separationHeader}>
          <Ionicons name="ellipsis-vertical" size={20} style={directionDetailsStyles.dragIcon} />
          <Divider
            style={{
              backgroundColor: '#9B9B9B',
              height: 1.5,
              flex: 1,
              alignSelf: 'center',
            }}
          />
        </View>

        <LocationRow
          icon="location-outline"
          text={getDisplayText(destinationRoom, 'Set destination')}
          testID="destination-location-button"
          onPress={onPressDestination}
        />
      </View>

      <View style={directionDetailsStyles.transportationHeader}>
        <View style={directionDetailsStyles.transportationSubHeader}>
          <TransportButton
            mode="walking"
            activeMode={activeMode}
            testID="transport-walk"
            onPress={() => handleSelectMode('walking')}
            icon={
              <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />
            }
          />

          <TransportButton
            mode="disability"
            activeMode={activeMode}
            testID="transport-car"
            onPress={() => handleSelectMode('disability')}
            icon={
              <FontAwesome
                name="wheelchair"
                size={30}
                style={directionDetailsStyles.transportationIcon}
              />
            }
          />
        </View>
      </View>

      {!!startRoom && !!destinationRoom && (
        <View style={directionDetailsStyles.routeMetaContainer}>
          <View style={directionDetailsStyles.routeSummaryRow}>
            <Text
              style={[directionDetailsStyles.routePrimaryText, !hasPath && { color: '#FF4444' }]}
            >
              {hasPath ? 'PATH READY' : 'NO PATH'}
            </Text>
            <TouchableOpacity
              style={[
                directionDetailsStyles.routeGoButton,
                !hasPath && directionDetailsStyles.routeGoButtonDisabled,
              ]}
              onPress={hasPath ? onPressGo : undefined}
              disabled={!hasPath}
            >
              <Text style={directionDetailsStyles.routeGoText}>GO</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
}
