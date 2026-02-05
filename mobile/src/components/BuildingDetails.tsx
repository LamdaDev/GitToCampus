//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useMemo, useRef, ReactNode, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Divider } from 'react-native-paper';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import { bottomSliderStyles } from '../styles/BottomSlider.styles';
import { BuildingShape } from '../types/BuildingShape';

type BuildingDetailProps = {
  selectedBuilding: BuildingShape | null;
};

export default function BuildingDetails({ selectedBuilding }: BuildingDetailProps) {
  const hotspots = selectedBuilding?.hotspots;
  const services = selectedBuilding?.services;

  const hotspotsSection =
    hotspots && Object.keys(hotspots).length > 0 ? (
      <Section title="Hotspots">
        <Divider style={{ backgroundColor: '#9B9B9B', height: 1, marginVertical: 8 }} />
        {Object.entries(hotspots).map(([name, url]) => (
          <Bullet key={name} name={name} link={url} />
        ))}
      </Section>
    ) : null;

  const servicesSection =
    services && Object.keys(services).length > 0 ? (
      <Section title="Services">
        <Divider style={{ backgroundColor: '#9B9B9B', height: 1, marginVertical: 8 }} />
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
      <View style={bottomSliderStyles.header}>
        <View>
          <Text style={bottomSliderStyles.title}>{selectedBuilding?.name}</Text>
          <Text style={bottomSliderStyles.subtitle}>{selectedBuilding?.address}</Text>
        </View>
        <View style={bottomSliderStyles.headerIcons}>
          <TouchableOpacity style={bottomSliderStyles.iconButton}>
            <Ionicons name="enter-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={bottomSliderStyles.iconButton}>
            <Ionicons name="location" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={bottomSliderStyles.iconButton}>
            <Ionicons name="close-sharp" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
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
    <View style={bottomSliderStyles.section}>
      <View style={bottomSliderStyles.sectionHeader}>
        <Text style={bottomSliderStyles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

const Bullet = ({ name, link }: BulletProps) => {
  return (
    <View style={bottomSliderStyles.bulletRow}>
      <Text style={bottomSliderStyles.bullet}>•</Text>
      <Text style={bottomSliderStyles.bulletText} onPress={() => Linking.openURL(`${link}`)}>
        {name}
      </Text>
    </View>
  );
};
