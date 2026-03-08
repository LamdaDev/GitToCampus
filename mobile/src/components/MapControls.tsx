import React from 'react';
import { Pressable, StatusBar, Text, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import styles from '../styles/MapControls.styles';
import type { Campus } from '../types/Campus';

const BASE_BOTTOM_OFFSET = 110;
const BASE_CALENDAR_TOP_OFFSET = 0;
const SHEET_SPACING = 16;

type Props = {
  selectedCampus: Campus;
  onToggleCampus: () => void;
  onRecenter: () => void;
  onOpenCalendar?: () => void;
  bottomSheetAnimatedPosition?: SharedValue<number>;
};

const MapControls = ({
  selectedCampus,
  onToggleCampus,
  onRecenter,
  onOpenCalendar,
  bottomSheetAnimatedPosition,
}: Props) => {
  const label = selectedCampus === 'SGW' ? 'SGW' : 'LOY';
  const { height: windowHeight } = useWindowDimensions();
  const calendarTopOffset = (StatusBar.currentHeight ?? 0) + BASE_CALENDAR_TOP_OFFSET;
  const animatedContainerStyle = useAnimatedStyle(() => {
    if (!bottomSheetAnimatedPosition) {
      return { bottom: BASE_BOTTOM_OFFSET };
    }

    const sheetTop = bottomSheetAnimatedPosition.value;
    const visibleSheetHeight = Math.max(0, windowHeight - sheetTop);
    return { bottom: Math.max(BASE_BOTTOM_OFFSET, visibleSheetHeight + SHEET_SPACING) };
  }, [bottomSheetAnimatedPosition, windowHeight]);

  return (
    <>
      {onOpenCalendar ? (
        <Pressable
          onPress={onOpenCalendar}
          style={({ pressed }) => [
            styles.calendarButton,
            { top: calendarTopOffset },
            pressed && styles.buttonPressed,
          ]}
          accessibilityLabel="Open Calendar"
        >
          <Ionicons name="calendar-outline" size={22} color="#EAEAEA" />
        </Pressable>
      ) : null}

      <Animated.View style={[styles.container, animatedContainerStyle]}>
        {/* Top Button: Campus Toggle */}
        <Pressable
          onPress={onToggleCampus}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityLabel="Toggle Campus"
        >
          <Text style={styles.label}>{label}</Text>
        </Pressable>

        {/* Bottom Button: Recenter */}
        <Pressable
          onPress={onRecenter}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityLabel="Recenter Map"
        >
          <Ionicons name="navigate" size={20} color="#EAEAEA" />
        </Pressable>
      </Animated.View>
    </>
  );
};

export default MapControls;
