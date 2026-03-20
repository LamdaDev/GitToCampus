import React from 'react';
import { searchBar } from '../styles/AppSearchBar.styles';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AppSearchBarProps = {
  openSearch: () => void;
  isIndoor:boolean;
};

export default function AppSearchBar({ openSearch, isIndoor }: Readonly<AppSearchBarProps>) {
  return (
    <View style={searchBar.container}>
      <TouchableOpacity onPress={openSearch}>
        <View style={searchBar.inputContainer}>
          <Ionicons name="search-outline" size={25} color="#7d7476" />
          <Text style={searchBar.font}>Get to...</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
