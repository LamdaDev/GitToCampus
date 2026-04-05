import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import type { IndoorRoutePlannerMode, RoutePlannerMode } from '../types/SheetMode';

type HybridDirectionsDetailsProps = {
  onClose: () => void;
  onClear?: () => void;
  startLabel: string | null;
  destinationLabel: string | null;
  selectedIndoorMode: IndoorRoutePlannerMode;
  selectedOutdoorMode: RoutePlannerMode;
  onIndoorModeChange: (mode: IndoorRoutePlannerMode) => void;
  onOutdoorModeChange: (mode: RoutePlannerMode) => void;
  onPressStart?: () => void;
  onPressDestination?: () => void;
  onPressGo?: () => void;
  errorMessage?: string | null;
  summaryMessage?: string | null;
  goDisabled?: boolean;
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
      <Ionicons name={icon as never} size={20} style={directionDetailsStyles.frontIcon} />
      <TouchableOpacity
        testID={testID}
        style={directionDetailsStyles.locationButton}
        onPress={onPress}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={directionDetailsStyles.hybridLocationText}
        >
          {text}
        </Text>
      </TouchableOpacity>
    </View>
    <View style={directionDetailsStyles.subLocationHeader}>
      <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
    </View>
  </View>
);

const ModeButton = ({
  testID,
  active,
  onPress,
  icon,
}: {
  testID: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) => (
  <TouchableOpacity
    testID={testID}
    accessibilityState={{ selected: active }}
    style={[
      directionDetailsStyles.transportationButton,
      active && directionDetailsStyles.activeTransportationButton,
    ]}
    onPress={onPress}
  >
    {icon}
  </TouchableOpacity>
);

type HybridModeOption = {
  testID: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
};

const HybridNavigationOptions = ({
  title,
  options,
}: {
  title: string;
  options: HybridModeOption[];
}) => (
  <View style={directionDetailsStyles.hybridSectionCard}>
    <Text style={directionDetailsStyles.hybridSectionTitle}>{title}</Text>
    <View style={directionDetailsStyles.transportationHeader}>
      <View style={directionDetailsStyles.transportationSubHeader}>
        {options.map((option) => (
          <ModeButton
            key={option.testID}
            testID={option.testID}
            active={option.active}
            onPress={option.onPress}
            icon={option.icon}
          />
        ))}
      </View>
    </View>
  </View>
);

export default function HybridDirectionsDetails({
  onClose,
  onClear,
  startLabel,
  destinationLabel,
  selectedIndoorMode,
  selectedOutdoorMode,
  onIndoorModeChange,
  onOutdoorModeChange,
  onPressStart,
  onPressDestination,
  onPressGo,
  errorMessage,
  summaryMessage,
  goDisabled = false,
}: Readonly<HybridDirectionsDetailsProps>) {
  const canPressGo = !goDisabled && !!onPressGo;
  let summaryContent = (
    <Text style={directionDetailsStyles.hybridSummarySubtitle}>{'Indoor & Outdoor'}</Text>
  );
  if (errorMessage) {
    summaryContent = (
      <Text testID="hybrid-error-message" style={directionDetailsStyles.routeErrorText}>
        {errorMessage}
      </Text>
    );
  } else if (summaryMessage) {
    summaryContent = (
      <Text testID="hybrid-summary-message" style={directionDetailsStyles.hybridSummarySubtitle}>
        {summaryMessage}
      </Text>
    );
  }

  const indoorOptions: HybridModeOption[] = [
    {
      testID: 'hybrid-indoor-walking',
      active: selectedIndoorMode === 'walking',
      onPress: () => onIndoorModeChange('walking'),
      icon: <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />,
    },
    {
      testID: 'hybrid-indoor-disability',
      active: selectedIndoorMode === 'disability',
      onPress: () => onIndoorModeChange('disability'),
      icon: (
        <FontAwesome
          name="wheelchair"
          size={30}
          style={directionDetailsStyles.transportationIcon}
        />
      ),
    },
  ];

  const outdoorOptions: HybridModeOption[] = [
    {
      testID: 'hybrid-outdoor-walking',
      active: selectedOutdoorMode === 'walking',
      onPress: () => onOutdoorModeChange('walking'),
      icon: <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />,
    },
    {
      testID: 'hybrid-outdoor-driving',
      active: selectedOutdoorMode === 'driving',
      onPress: () => onOutdoorModeChange('driving'),
      icon: (
        <Ionicons name="car-outline" size={30} style={directionDetailsStyles.transportationIcon} />
      ),
    },
    {
      testID: 'hybrid-outdoor-transit',
      active: selectedOutdoorMode === 'transit',
      onPress: () => onOutdoorModeChange('transit'),
      icon: (
        <Ionicons
          name="train-outline"
          size={30}
          style={directionDetailsStyles.transportationIcon}
        />
      ),
    },
    {
      testID: 'hybrid-outdoor-shuttle',
      active: selectedOutdoorMode === 'shuttle',
      onPress: () => onOutdoorModeChange('shuttle'),
      icon: (
        <Ionicons name="bus-outline" size={30} style={directionDetailsStyles.transportationIcon} />
      ),
    },
  ];

  return (
    <View testID="hybrid-directions-details">
      <View style={directionDetailsStyles.header}>
        <View>
          <Text style={directionDetailsStyles.directionTitle}> Directions </Text>
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          {onClear ? (
            <TouchableOpacity
              testID="hybrid-clear-button"
              style={directionDetailsStyles.iconButton}
              accessibilityLabel="Clear route"
              onPress={onClear}
            >
              <Ionicons name="refresh-outline" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            testID="hybrid-directions-close-button"
            style={directionDetailsStyles.iconButton}
            accessibilityLabel="Close directions"
            onPress={onClose}
          >
            <Ionicons name="close-outline" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={directionDetailsStyles.locationHeader}>
        <LocationRow
          icon="navigate"
          text={getDisplayText(startLabel, 'Set as starting point')}
          testID="hybrid-start-location-button"
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
          text={getDisplayText(destinationLabel, 'Set destination')}
          testID="hybrid-destination-location-button"
          onPress={onPressDestination}
        />
      </View>

      <HybridNavigationOptions title="Indoor Navigation" options={indoorOptions} />
      <HybridNavigationOptions title="Outdoor Navigation" options={outdoorOptions} />

      <View style={directionDetailsStyles.hybridSummaryCard}>
        <View style={directionDetailsStyles.hybridSummaryTextWrap}>
          <Text style={directionDetailsStyles.hybridSummaryTitle}>Full Route</Text>
          {summaryContent}
        </View>
        <TouchableOpacity
          testID="hybrid-go-button"
          disabled={!canPressGo}
          activeOpacity={canPressGo ? 0.85 : 1}
          accessibilityState={{ disabled: !canPressGo }}
          style={[
            directionDetailsStyles.routeGoButton,
            !canPressGo && directionDetailsStyles.routeGoButtonDisabled,
          ]}
          onPress={canPressGo ? onPressGo : undefined}
        >
          <Text style={directionDetailsStyles.routeGoText}>GO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
