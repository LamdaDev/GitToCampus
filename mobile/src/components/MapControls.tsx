import React from 'react';
import { Pressable, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import styles from '../styles/MapControls.styles';
import type { Campus } from '../types/Campus';

const BASE_BOTTOM_OFFSET = 110;
const SHEET_SPACING = 16;

type Props = {
  selectedCampus: Campus;
  onToggleCampus: () => void;
  onRecenter: () => void;
  bottomSheetAnimatedPosition?: SharedValue<number>;
};

const MapControls = ({
  selectedCampus,
  onToggleCampus,
  onRecenter,
  bottomSheetAnimatedPosition,
}: Props) => {
  const label = selectedCampus === 'SGW' ? 'SGW' : 'LOY';
  const { height: windowHeight } = useWindowDimensions();
  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!bottomSheetAnimatedPosition) {
      return { bottom: BASE_BOTTOM_OFFSET };
    }

    const sheetTop = bottomSheetAnimatedPosition.value;
    const visibleSheetHeight = Math.max(0, windowHeight - sheetTop);
    return { bottom: Math.max(BASE_BOTTOM_OFFSET, visibleSheetHeight + SHEET_SPACING) };
  }, [bottomSheetAnimatedPosition, windowHeight]);

  return (
    <Animated.View style={[styles.container, animatedContainerStyle]}>
      {/* Top Button: Campus Toggle */}
      <Pressable
        onPress={onToggleCampus}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityLabel="Toggle Campus"
      >
        <Text style={styles.label}>{label}</Text>
      </Pressable>

      {/* Horizontal Divider Line */}
      {/* <View style={styles.divider} /> */}

      {/* Bottom Button: Recenter */}
      <Pressable
        onPress={onRecenter}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        accessibilityLabel="Recenter Map"
      >
        <Ionicons name="navigate" size={20} color="#EAEAEA" />
      </Pressable>
    </Animated.View>
  );
};

export default MapControls;
