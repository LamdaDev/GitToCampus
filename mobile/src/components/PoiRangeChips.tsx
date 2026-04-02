import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { PoiRangeKm } from '../types/Poi';
import styles from '../styles/PoiRangeChips.styles';

type PoiRangeChipsProps = {
  selectedRangeKm: PoiRangeKm;
  onSelectRangeKm: (rangeKm: PoiRangeKm) => void;
  disabled?: boolean;
};

const rangeOptions: PoiRangeKm[] = [1, 2, 3];

const PoiRangeChips = ({
  selectedRangeKm,
  onSelectRangeKm,
  disabled = false,
}: PoiRangeChipsProps) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {rangeOptions.map((rangeKm) => {
        const isSelected = selectedRangeKm === rangeKm;
        return (
          <Pressable
            key={rangeKm}
            testID={`poi-range-chip-${rangeKm}km`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: isSelected }}
            disabled={disabled}
            onPress={() => onSelectRangeKm(rangeKm)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {rangeKm} km
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default PoiRangeChips;
