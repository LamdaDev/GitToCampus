import React from 'react';
import { SearchBar } from 'react-native-elements';
import { searchBar } from '../styles/AppSearchBar.styles';
type AppSearchBarProps = {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
};

export default function AppSearchBar({
  value,
  onChange,
  placeholder = 'Type here...',
}: AppSearchBarProps) {
  return (
    <SearchBar
      placeholder={placeholder}
      onChangeText={onChange}
      value={value}
      platform="default"
      containerStyle={searchBar.container}
      inputContainerStyle={searchBar.inputContainer}
      inputStyle={searchBar.inputText}
      placeholderTextColor="#cfcfcf"
    />
  );
}
