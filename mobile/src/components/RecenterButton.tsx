import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import styles from '../styles/RecenterButton.styles';

type Props = {
  onPress: () => void;
};

const RecenterButton = ({ onPress }: Props) => {
  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Recenter Map"
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed 
        ]}
      >
        {/* Using a standard location icon */}
        <Ionicons name="locate" size={28} color="#d8d8d8" />
      </Pressable>
    </View>
  );
};

export default RecenterButton;