import React from 'react';
import { searchBar } from '../styles/AppSearchBar.styles';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AppSearchBar() {
  return (
    <View style={searchBar.container}>
      <TouchableOpacity>
        <View style={searchBar.inputContainer}>
          <Ionicons name="search-outline" size={25} color={'#7d7476'}></Ionicons>

          <Text style={searchBar.font}>Get to...</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
