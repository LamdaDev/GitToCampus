import React, { useState } from 'react';
import { View,Text } from 'react-native';
import { SearchBar } from 'react-native-elements';

export default function SearchSheet() {
  const [search, setSearch] = useState('');

  return (
    <View>
      <SearchBar
        placeholder="Type Here..."
        onChangeText={setSearch}
        value={search}
        platform="default"
      />
      
    </View>
  );
}
