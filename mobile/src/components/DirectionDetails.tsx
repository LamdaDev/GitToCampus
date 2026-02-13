//BuildingDetails.tsx loads building details upon tapping a building the user chooses.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

import { directionDetailsStyles } from '../styles/DirectionDetails.styles';
import { BuildingShape } from '../types/BuildingShape';

// type DirectionSelectMode = 'start' | 'destination' | null;

type DirectionDetailProps = {
  onClose: () => void;
  startBuilding: BuildingShape | null;
  destinationBuilding: BuildingShape | null;
  //selectMode: 'start' | 'destination' | null;
  //onSelectStart: () => void;
  //onSelectDestination: () => void;
};

export default function DirectionDetails({
  startBuilding,
  destinationBuilding,
  onClose,
}: DirectionDetailProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <>
      <View style={directionDetailsStyles.header}>
        <View>
          <Text style={directionDetailsStyles.directionTitle}> Directions </Text>
        </View>
        <View style={directionDetailsStyles.headerIcons}>
          <TouchableOpacity style={directionDetailsStyles.iconButton} onPress={onClose}>
            <Ionicons name="close-sharp" size={25} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={directionDetailsStyles.locationHeader}>
        <View style={directionDetailsStyles.header}>
          <View style={directionDetailsStyles.inlineHeader}>
            <Ionicons name="navigate" size={20} style={directionDetailsStyles.frontIcon} />
            <TouchableOpacity style={directionDetailsStyles.locationButton}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, color: 'white' }}>
                {startBuilding?.name ?? 'Set as starting point'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={directionDetailsStyles.subLocationHeader}>
            <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
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
            <TouchableOpacity style={directionDetailsStyles.locationButton}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 15, color: 'white' }}>
                {destinationBuilding?.name ?? 'Set destination'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={directionDetailsStyles.subLocationHeader}>
            <Ionicons name="menu-outline" size={20} style={directionDetailsStyles.dragIcon} />
          </View>
        </View>
      </View>
      <View style={directionDetailsStyles.transportationHeader}>
        <View style={directionDetailsStyles.transportationSubHeader}>
          <TouchableOpacity
            testID="transport-walk"
            accessibilityState={{ selected: activeIndex === 0 }}
            style={[
              directionDetailsStyles.transportationButton,
              activeIndex === 0 && { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
            ]}
            onPress={() => setActiveIndex(0)}
          >
            <Ionicons name="walk" size={30} style={directionDetailsStyles.transportationIcon} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-car"
            accessibilityState={{ selected: activeIndex === 1 }}
            style={[
              directionDetailsStyles.transportationButton,
              activeIndex === 1 && { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
            ]}
            onPress={() => setActiveIndex(1)}
          >
            <Ionicons
              name="car-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
          <TouchableOpacity
            testID="transport-bus"
            accessibilityState={{ selected: activeIndex === 2 }}
            style={[
              directionDetailsStyles.transportationButton,
              activeIndex === 2 && { backgroundColor: 'rgba(0, 0, 0, 0.4)' },
            ]}
            onPress={() => setActiveIndex(2)}
          >
            <Ionicons
              name="bus-outline"
              size={30}
              style={directionDetailsStyles.transportationIcon}
            />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}
