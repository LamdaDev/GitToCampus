import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { POI_CATEGORY_LABELS } from '../constants/poi';
import type { PoiCategory } from '../types/Poi';
import styles from '../styles/PoiCategoryChips.styles';

type PoiCategoryChipsProps = {
  selectedCategory: PoiCategory | null;
  onSelectCategory: (category: PoiCategory | null) => void;
  disabled?: boolean;
};

const categories = Object.keys(POI_CATEGORY_LABELS) as PoiCategory[];

const PoiCategoryChips = ({
  selectedCategory,
  onSelectCategory,
  disabled = false,
}: PoiCategoryChipsProps) => {
  return (
    <View style={styles.container} pointerEvents="box-none">
      {categories.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <Pressable
            key={category}
            testID={`poi-chip-${category}`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: isSelected }}
            disabled={disabled}
            onPress={() => onSelectCategory(isSelected ? null : category)}
            style={({ pressed }) => [
              styles.chip,
              isSelected && styles.chipSelected,
              pressed && styles.chipPressed,
            ]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {POI_CATEGORY_LABELS[category]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default PoiCategoryChips;
