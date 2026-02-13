//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useMemo, useRef, ReactNode, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Divider } from 'react-native-paper';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import { BuildingShape } from '../types/BuildingShape';

type BuildingDetailProps = {
  selectedBuilding: BuildingShape | null;
  onClose: () => void;
  onShowDirections: (building: BuildingShape) => void;
};

export default function BuildingDetails({
  selectedBuilding,
  onClose,
  onShowDirections,
}: BuildingDetailProps) {
  const hotspots = selectedBuilding?.hotspots;
  const services = selectedBuilding?.services;

  /**
   * hotspotsSection & servicesSection loads any information if present, else it will render nothing
   */
  const navigationSection = (
    <Section title="Navigation">
      <View style={buildingDetailsStyles.navigationSection}>
        <TouchableOpacity style={buildingDetailsStyles.navigationButton}>
          <Ionicons name="walk" size={25} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={buildingDetailsStyles.navigationButton}
          onPress={() => {
            if (selectedBuilding) {
              onShowDirections(selectedBuilding);
            }
          }}
        >
          <Text style={{ fontSize: 15, color: 'white' }}> Set as starting point </Text>
        </TouchableOpacity>
      </View>
    </Section>
  );

  const hotspotsSection =
    hotspots && Object.keys(hotspots).length > 0 ? (
      <Section title="Hotspots">
        <Divider style={{ backgroundColor: '#9B9B9B', height: 1.5, marginVertical: 8 }} />
        {Object.entries(hotspots).map(([name, url]) => (
          <Bullet key={name} name={name} link={url} />
        ))}
      </Section>
    ) : null;

  const servicesSection =
    services && Object.keys(services).length > 0 ? (
      <Section title="Services">
        <Divider style={{ backgroundColor: '#9B9B9B', height: 1.5, marginVertical: 8 }} />
        {services
          ? Object.entries(services).map(([name, url]) => (
              <Bullet key={name} name={name} link={url} />
            ))
          : ''}
      </Section>
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
      {/* Building Hotspots */}
      {hotspotsSection}
      {/* Building Services*/}
      {servicesSection}
    </>
  );
}

/* ---------- Types ---------- */

type SectionProps = {
  title: string;
  children: ReactNode;
};

type BulletProps = {
  name: string;
  link: string;
};

/* ---------- Reusable Components ---------- */

const Section = ({ title, children }: SectionProps) => {
  return (
    <View style={buildingDetailsStyles.section}>
      <View style={buildingDetailsStyles.sectionHeader}>
        <Text style={buildingDetailsStyles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

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
