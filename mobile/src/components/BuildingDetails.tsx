//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useEffect, useMemo, useRef } from 'react';
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

type BuildingService = {
  id: string;
  name: string;
  url: string;
};

type BuildingServicesRow = {
  id: string;
  services: BuildingService[];
};

type BuildingImage = {
  key: string;
  url: string;
};

const toSafeImageUrl = (rawUrl: string): string | null => {
  const normalizedUrl = rawUrl.trim();
  if (!normalizedUrl) return null;
  if (/^https?:\/\//i.test(normalizedUrl)) return normalizedUrl;
  return `https://${normalizedUrl}`;
};

const toBuildingImages = (images: string[] | undefined): BuildingImage[] => {
  if (!images || images.length === 0) return [];

  const seenCountsByUrl = new Map<string, number>();
  const buildingImages: BuildingImage[] = [];

  for (const imageUrl of images) {
    const safeUrl = toSafeImageUrl(imageUrl);
    if (!safeUrl) continue;

    const currentCount = (seenCountsByUrl.get(safeUrl) ?? 0) + 1;
    seenCountsByUrl.set(safeUrl, currentCount);
    buildingImages.push({
      key: `${safeUrl}#${currentCount}`,
      url: safeUrl,
    });
  }

  return buildingImages;
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
  const buildingImages = useMemo(
    () => toBuildingImages(selectedBuilding?.images),
    [selectedBuilding?.images],
  );

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
        {buildingImages.map((image) => (
          <View key={image.key} style={buildingDetailsStyles.imageWrapper}>
            <Image
              testID="carousel-image"
              source={{ uri: image.url }}
              style={buildingDetailsStyles.carouselImage}
              onError={(event) => {
                if (__DEV__) {
                  console.warn('[BuildingDetails] Failed to load building image', {
                    url: image.url,
                    error: event.nativeEvent.error,
                  });
                }
              }}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const servicesSection = (buildingServices: Record<string, string>): BuildingServicesRow[] => {
    const serviceEntries = Object.entries(buildingServices).map(([name, url]) => ({
      id: `${name}-${url}`,
      name,
      url,
    }));
    if (serviceEntries.length === 0) return [];

    const rows: BuildingServicesRow[] = [];
    for (let rowStart = 0; rowStart < serviceEntries.length; rowStart += 3) {
      const rowServices = serviceEntries.slice(rowStart, rowStart + 3);
      rows.push({
        id: rowServices.map((service) => service.id).join('|'),
        services: rowServices,
      });
    }

    return rows;
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
            renderItem={({ item }: ListRenderItemInfo<BuildingServicesRow>) => (
              <View key={item.id} style={buildingDetailsStyles.row}>
                {item.services.map((service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={buildingDetailsStyles.uniqueServiceContainer}
                    onPress={() => Linking.openURL(service.url)}
                  >
                    <Text style={buildingDetailsStyles.serviceText}>{service.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            keyExtractor={(item: BuildingServicesRow) => item.id}
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
