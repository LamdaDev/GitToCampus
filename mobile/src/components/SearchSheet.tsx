import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SearchBar } from 'react-native-elements';
import { searchBuilding } from '../styles/SearchBuilding.styles';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { BuildingShape } from '../types/BuildingShape';

type SearchBarProps = {
  buildings: BuildingShape[];
  onPressBuilding?: (b: BuildingShape) => void;
};

export default function SearchSheet({ buildings, onPressBuilding }: Readonly<SearchBarProps>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const searchCriteria = search.trim().toLowerCase();
    if (!searchCriteria) return buildings;
    return buildings.filter((building) =>
      (building.name + ' ' + building.address).toLowerCase().includes(searchCriteria),
    );
  }, [search, buildings]);

  return (
    <View style={searchBuilding.screen}>
      <SearchBar
        placeholder="Search buildings..."
        onChangeText={setSearch}
        value={search}
        platform="default"
        containerStyle={searchBuilding.searchOuter}
        inputContainerStyle={searchBuilding.searchInner}
        inputStyle={searchBuilding.searchText}
        placeholderTextColor={'#ffffffc9'}
        searchIcon={
          <Ionicons
            name="search"
            size={25}
            color="#d7c9cf"
            style={{ opacity: 0.9, paddingLeft: 2 }}
          />
        }
      />

      <Text style={searchBuilding.helperText}>Sign in below to sync your calendar</Text>

      <TouchableOpacity style={searchBuilding.signIn}>
        <Ionicons name="logo-google" size={18} color="#111" />
        <Text style={searchBuilding.signInText}>Sign in with Google</Text>
      </TouchableOpacity>

      <View style={[searchBuilding.buildingsContainer, { maxHeight: 400 }]}>
        <BottomSheetFlatList
          data={filtered}
          keyExtractor={(item: { id: any }) => item.id}
          contentContainerStyle={searchBuilding.listContent}
          showsVerticalScrollIndicator={true}
          ListEmptyComponent={<Text style={searchBuilding.emptyText}>No buildings found</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={searchBuilding.buildingPill}
              activeOpacity={0.85}
              onPress={() => onPressBuilding?.(item)}
            >
              <View style={searchBuilding.iconWrap}>
                <Ionicons name="location-outline" size={34} color="#F5F1F2" />
              </View>

              <View style={searchBuilding.textWrap}>
                <Text style={searchBuilding.buildingName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={searchBuilding.buildingAddress} numberOfLines={1}>
                  {'(' + item.shortCode + ') '}
                  {item.address}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}
