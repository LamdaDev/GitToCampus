import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import styles from '../../styles/IndoorControls.styles';
import type { BuildingShape } from '../../types/BuildingShape';

type Props = {
  onExitIndoor: () => void;
  onOpenCalendar?: () => void;
  onFloorUp: () => void;
  onFloorDown: () => void;
  openAvailableBuildings: () => void;
  currentFloor: number | string | null;
  building: BuildingShape;
  isIndoorSheetOpen: boolean;
};

const IndoorControls = ({
  onExitIndoor,
  onOpenCalendar,
  onFloorUp,
  onFloorDown,
  openAvailableBuildings,
  currentFloor,
  building,
  isIndoorSheetOpen,
}: Props) => {
  const openBuildingList = () => {
    openAvailableBuildings();
  };
  return (
    <View style={styles.overlayRow}>
      {/* Floor selector */}
      <View style={styles.floorSelector}>
        <TouchableOpacity style={styles.floorArrowButton} onPress={onFloorUp}>
          <MaterialIcons name="keyboard-arrow-up" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.floorNumber}>{currentFloor}</Text>
        <TouchableOpacity style={styles.floorArrowButton} onPress={onFloorDown}>
          <MaterialIcons name="keyboard-arrow-down" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Building name */}
      <View style={styles.buildingNamePill}>
        <TouchableOpacity onPress={openBuildingList}>
          <Text style={styles.buildingNameText}>
            {building.shortCode} ({building.name})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Icon buttons */}
      <View style={styles.iconButtonGroup}>
        <TouchableOpacity style={styles.iconButton} onPress={onExitIndoor}>
          <Ionicons name="map-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isIndoorSheetOpen}
          style={isIndoorSheetOpen ? styles.iconButtonDisabled : styles.iconButton}
          onPress={onOpenCalendar}
        >
          <Ionicons name="calendar-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IndoorControls;
