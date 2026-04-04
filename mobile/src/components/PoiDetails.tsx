import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

import { buildingDetailsStyles } from '../styles/BuildingDetails.styles';
import type { OutdoorPoi } from '../types/Poi';

type PoiDetailsProps = {
  selectedPoi: OutdoorPoi | null;
  onClose: () => void;
  onGetDirections?: (poi: OutdoorPoi) => void;
};

export default function PoiDetails({
  selectedPoi,
  onClose,
  onGetDirections,
}: Readonly<PoiDetailsProps>) {
  if (!selectedPoi) return null;

  return (
    <>
      <View style={buildingDetailsStyles.header}>
        <View>
          <Text style={buildingDetailsStyles.title}>{selectedPoi.name}</Text>
          <Text style={buildingDetailsStyles.subtitle}>{selectedPoi.address}</Text>
          <Text style={buildingDetailsStyles.subtitle}>
            {selectedPoi.category.charAt(0).toUpperCase() + selectedPoi.category.slice(1)}
          </Text>
        </View>
        <View style={buildingDetailsStyles.headerIcons}>
          <TouchableOpacity
            testID="poi-details-close-button"
            style={buildingDetailsStyles.iconButton}
            onPress={onClose}
          >
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={buildingDetailsStyles.navigationSection}>
        <TouchableOpacity
          testID="poi-get-directions-button"
          style={buildingDetailsStyles.navigationButton}
          onPress={() => onGetDirections?.(selectedPoi)}
        >
          <Feather name="corner-down-right" size={20} color="#fff" />
          <Text style={buildingDetailsStyles.navigationButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}
