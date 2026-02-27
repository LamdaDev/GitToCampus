//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';

type BuildingDetailProps = {
  selectedBuilding: BuildingShape | null;
  onClose: () => void;
  onShowDirections: (building: BuildingShape, asDestination?: boolean) => void;
  currentBuilding: BuildingShape | null;
  userLocation: UserCoords | null;
};

export default function BuildingDetails({
  selectedBuilding,
  onClose,
  onShowDirections,
  currentBuilding: _currentBuilding,
  userLocation: _userLocation,
}: Readonly<BuildingDetailProps>) {
  const services = selectedBuilding?.services;

  /**
   * Handle the walking figure button press.
   * Sets the selected building as destination with current location as start.
   */
  const handleDirectionsToPress = () => {
    if (selectedBuilding) {
      onShowDirections(selectedBuilding, true);
    }
  };

  const handleStartFromPress = () => {
    if (selectedBuilding) {
      onShowDirections(selectedBuilding, false);
    }
  };

  /**
   * hotspotsSection & servicesSection loads any information if present, else it will render nothing
   */
  const navigationSection = (
    <View style={buildingDetailsStyles.navigationSection}>
      <TouchableOpacity
        testID="walking-figure-button"
        style={buildingDetailsStyles.navigationButton}
        onPress={handleDirectionsToPress}
      >
        <Feather name="corner-down-right" size={20} color="#fff" />
        <Text style={buildingDetailsStyles.navigationButtonText}>Directions To</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={buildingDetailsStyles.navigationButton}
        onPress={handleStartFromPress}
      >
        <Ionicons name="navigate-outline" size={20} color="#fff" />
        <Text style={buildingDetailsStyles.navigationButtonText}>Start From</Text>
      </TouchableOpacity>
    </View>
  );

  const servicesSection =
    services && Object.keys(services).length > 0 ? (
      <View>
        <Text style={buildingDetailsStyles.servicesTitle}>Services</Text>
        {services
          ? Object.entries(services).map(([name, url]) => (
              <Bullet key={name} name={name} link={url} />
            ))
          : ''}
      </View>
    ) : null;

  return (
    <>
      {/* Header */}
      <View style={buildingDetailsStyles.header}>
        <View>
          <Text style={buildingDetailsStyles.title}>{selectedBuilding?.name}</Text>
          <Text style={buildingDetailsStyles.subtitle}>{selectedBuilding?.address}</Text>
        </View>
        <View style={buildingDetailsStyles.headerIcons}>
          <TouchableOpacity style={buildingDetailsStyles.iconButton}>
            <Ionicons name="enter-outline" size={25} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={buildingDetailsStyles.iconButton} onPress={onClose}>
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      {/* Navigation Section */}
      {navigationSection}
      <View style={buildingDetailsStyles.servicesContainer}>
        {/* Building Services*/}
        {servicesSection}
      </View>
    </>
  );
}

/* ---------- Types ---------- */

type BulletProps = {
  name: string;
  link: string;
};

/* ---------- Reusable Components ---------- */

const Bullet = ({ name, link }: BulletProps) => {
  return (
    <View style={buildingDetailsStyles.bulletRow}>
      <Text style={buildingDetailsStyles.bullet}>•</Text>
      <Text style={buildingDetailsStyles.bulletText} onPress={() => Linking.openURL(`${link}`)}>
        {name}
      </Text>
    </View>
  );
};
