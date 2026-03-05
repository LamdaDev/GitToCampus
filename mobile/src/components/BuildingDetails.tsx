//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Linking, ScrollView, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import { BuildingShape } from '../types/BuildingShape';
import type { UserCoords } from '../screens/MapScreen';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import type { ListRenderItemInfo } from 'react-native';

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
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollViewWidth = useRef(0);
  const contentWidth = useRef(0);
  const services = selectedBuilding?.services;

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

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: (contentWidth.current - scrollViewWidth.current) / 2,
      });
    }, 50);
  }, [selectedBuilding]);

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

  const carouselSection = (
    <View style={buildingDetailsStyles.carouselContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        scrollEventThrottle={16}
        style={buildingDetailsStyles.carousel}
        ref={scrollViewRef}
        onLayout={(e) => {
          scrollViewWidth.current = e.nativeEvent.layout.width;
        }}
        onContentSizeChange={(width) => {
          contentWidth.current = width;
        }}
      >
        {selectedBuilding?.images?.map((imgUrl, index) => (
          <View key={index} style={buildingDetailsStyles.imageWrapper}>
            <Image
              testID="carousel-image"
              source={{ uri: imgUrl }}
              style={buildingDetailsStyles.carouselImage}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const servicesSection = (buildingServices: Record<string, string>) => {
    const entries = Object.entries(buildingServices);
    if (entries.length === 0) return [];

    return entries.reduce(
      (rows, [name, url], index) => {
        if (index % 3 === 0) rows.push([]);
        rows[rows.length - 1].push({ name, url });
        return rows;
      },
      [] as Array<Array<{ name: string; url: string }>>,
    );
  };

  return (
    <>
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
        <View style={[buildingDetailsStyles.servicesContainer, { maxHeight: 300 }]}>
          <Text style={buildingDetailsStyles.servicesTitle}>Services</Text>
          <BottomSheetFlatList
            data={servicesSection(services)}
            renderItem={({
              item,
              index,
            }: ListRenderItemInfo<Array<{ name: string; url: string }>>) => (
              <View key={index} style={buildingDetailsStyles.row}>
                {item.map((service: { name: string; url: string }, serviceIndex: number) => (
                  <TouchableOpacity
                    key={serviceIndex}
                    style={buildingDetailsStyles.uniqueServiceContainer}
                    onPress={() => Linking.openURL(service.url)}
                  >
                    <Text style={buildingDetailsStyles.serviceText}>{service.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            keyExtractor={(_item: Array<{ name: string; url: string }>, index: number) =>
              index.toString()
            }
            showsVerticalScrollIndicator={true}
          />
        </View>
      ) : (
        <View style={buildingDetailsStyles.servicesContainer}>
          <Text style={[buildingDetailsStyles.servicesTitle, { textAlign: 'center' }]}>
            No services available
          </Text>
        </View>
      )}
    </>
  );
}
