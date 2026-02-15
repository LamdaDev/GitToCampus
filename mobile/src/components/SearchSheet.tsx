import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SearchBar } from 'react-native-elements';
import { searchBuilding } from '../styles/SearchBuilding.styles';
import { Ionicons } from '@expo/vector-icons';
export default function SearchSheet() {
  const [search, setSearch] = useState('');

  
  return (
    <View>
      <SearchBar
        placeholder="Type Here..."
        onChangeText={setSearch}
        value={search}
        platform="default"
        autoFocus
      />
      <Text style={{color:'#ffffff',textAlign:'center',marginTop:'15%',}}>Sign in below to sync your calendar</Text>
      
      <TouchableOpacity style={searchBuilding.signIn}>
        <Ionicons name='logo-google'></Ionicons>
        <Text>Sign in with Google</Text>
      </TouchableOpacity>
      {/**PLACEHOLDER INSERT GOOGLE CALENDAR UI HERE */}
      <View style={searchBuilding.buildingsContainer}>
            <TouchableOpacity style={searchBuilding.buildingPill}>
                <Ionicons name='location-outline'></Ionicons>
                <View>
                    <Text>Building Name</Text>
                    <Text>1234 blvd. fake address</Text>
                </View>
            </TouchableOpacity>
      </View>
    </View>
  );
}
