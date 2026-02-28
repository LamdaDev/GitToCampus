//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';

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

  const [currentIndex, setCurrentIndex] = useState(0);

    const onScroll = (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.floor(contentOffsetX / 540);
      setCurrentIndex(index);
    };

  const carouselSection = (
    <View style={buildingDetailsStyles.carouselContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentOffset={{ x: currentIndex * 200, y: 0 }}
        style={buildingDetailsStyles.carousel}
      >
        <Image
          key={1}
          source={require('../../assets/favicon.png')}
          style={buildingDetailsStyles.carouselImage}
        />
        <Image
          key={2}
          source={require('../../assets/favicon.png')}
          style={buildingDetailsStyles.carouselImage}
        />
        <Image
          key={3}
          source={require('../../assets/favicon.png')}
          style={buildingDetailsStyles.carouselImage}
        />
      </ScrollView>
    </View>
  );

  const servicesSection = (row: { name: string; url: string }[]) =>
    services && Object.keys(services).length > 0 ? (
      <View>
        <Text style={buildingDetailsStyles.servicesTitle}>Services</Text>
        {/* Loop over services and create rows */}
        {Object.entries(services)
          .reduce(
            (rows, [name, url], index) => {
              // Create a new row for every 3 items
              if (index % 3 === 0) rows.push([]);
              rows[rows.length - 1].push({ name, url });
              return rows;
            },
            [] as { name: string; url: string }[][],
          )
          .map((row, rowIndex) => (
            <View key={rowIndex} style={buildingDetailsStyles.row}>
              {row.map((service, serviceIndex) => (
                <TouchableOpacity
                  key={serviceIndex}
                  style={buildingDetailsStyles.uniqueServiceContainer}
                  onPress={() => Linking.openURL(service.url)}
                >
                  <Text style={buildingDetailsStyles.serviceText}>{service.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
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
      {navigationSection}
      {carouselSection}
      {services && Object.keys(services).length > 0 ? (
        <View style={[buildingDetailsStyles.servicesContainer, { maxHeight: 400 }]}>
          <BottomSheetFlatList
            data={servicesSection} // Pass rows as data
            renderItem={({ item }) => servicesSection([item])}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={true}
          />
        </View>
      ) : null}
    </>
  );
}
