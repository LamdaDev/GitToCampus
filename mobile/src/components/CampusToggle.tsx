import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { Campus } from '../types/Campus';
import styles from '../styles/CampusToggle.styles';

type Props = {
  selectedCampus: Campus;
  onToggle: () => void;
}

const CampusToggle = ({ selectedCampus, onToggle }: Props) => {
  let nextCampus;
  if (selectedCampus === 'SGW') {
    nextCampus = 'LOYOLA';
  } else {
    nextCampus = 'SGW';
  }

  let nextLabel;
  if (nextCampus === 'SGW') {
    nextLabel = 'SGW';
  } else {
    nextLabel = 'LOY';
  }

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${nextCampus}`}
        onPress={onToggle}
        style={styles.button}
      >
        <Text style={styles.label}>{nextLabel}</Text>
      </Pressable>
    </View>
  );
}


export default CampusToggle;


