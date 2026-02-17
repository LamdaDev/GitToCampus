import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SearchSheet from '../src/components/SearchSheet';
import { Campus } from '../src/types/Campus';
import { BuildingShape } from '../src/types/BuildingShape';

const mockBuildings: BuildingShape[] = [
  {
    id: '1',
    name: 'Hall Building',
    address: '1455 De Maisonneuve',
    polygons: [],
    campus: 'SGW' as Campus,
  },
  {
    id: '2',
    name: 'Library Building',
    address: '1400 De Maisonneuve',
    polygons: [],
    campus: 'SGW' as Campus,
  },
  {
    id: '3',
    name: 'Loyola Chapel',
    address: '7141 Sherbrooke',
    polygons: [],
    campus: 'LOYOLA' as Campus,
  },
];

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

jest.mock('react-native-elements', () => {
  const { TextInput } = require('react-native');
  return {
    SearchBar: ({
      onChangeText,
      value,
      placeholder,
    }: {
      onChangeText: (text: string) => void;
      value: string;
      placeholder: string;
    }) => (
      <TextInput
        testID="search-bar"
        placeholder={placeholder}
        onChangeText={onChangeText}
        value={value}
      />
    ),
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const { FlatList } = require('react-native');
  return {
    BottomSheetFlatList: (props: React.ComponentProps<typeof FlatList>) => <FlatList {...props} />,
  };
});

describe('SearchSheet', () => {
  test('renders without crashing', () => {
    const { getByTestId } = render(<SearchSheet buildings={mockBuildings} />);
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('renders all buildings when search is empty', () => {
    const { getByText } = render(<SearchSheet buildings={mockBuildings} />);
    expect(getByText('Hall Building')).toBeTruthy();
    expect(getByText('Library Building')).toBeTruthy();
    expect(getByText('Loyola Chapel')).toBeTruthy();
  });

  test('filters buildings by name', () => {
    const { getByTestId, getByText, queryByText } = render(
      <SearchSheet buildings={mockBuildings} />,
    );
    fireEvent.changeText(getByTestId('search-bar'), 'hall');
    expect(getByText('Hall Building')).toBeTruthy();
    expect(queryByText('Library Building')).toBeNull();
    expect(queryByText('Loyola Chapel')).toBeNull();
  });

  test('filters buildings by address', () => {
    const { getByTestId, getByText, queryByText } = render(
      <SearchSheet buildings={mockBuildings} />,
    );
    fireEvent.changeText(getByTestId('search-bar'), 'Sherbrooke');
    expect(getByText('Loyola Chapel')).toBeTruthy();
    expect(queryByText('Hall Building')).toBeNull();
  });

  test('shows empty message when no buildings match', () => {
    const { getByTestId, getByText } = render(<SearchSheet buildings={mockBuildings} />);
    fireEvent.changeText(getByTestId('search-bar'), 'zzznomatch');
    expect(getByText('No buildings found')).toBeTruthy();
  });

  test('calls onPressBuilding with correct building when pressed', () => {
    const onPressBuilding = jest.fn();
    const { getByText } = render(
      <SearchSheet buildings={mockBuildings} onPressBuilding={onPressBuilding} />,
    );
    fireEvent.press(getByText('Hall Building'));
    expect(onPressBuilding).toHaveBeenCalledWith(mockBuildings[0]);
  });
});
