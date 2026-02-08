import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/MapControls.styles';
import type { Campus } from '../types/Campus';

type Props = {
  selectedCampus: Campus;
  onToggleCampus: () => void;
  onRecenter: () => void;
};

const MapControls = ({ selectedCampus, onToggleCampus, onRecenter }: Props) => {
  const label = selectedCampus === 'SGW' ? 'SGW' : 'LOY';

  return (
    <View style={styles.container}>
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
    </View>
  );
};

export default MapControls;
