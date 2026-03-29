import React, {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { SearchBar } from 'react-native-elements';
import { Ionicons } from '@expo/vector-icons';
import { searchBuilding } from '../../styles/SearchBuilding.styles';
import { getFloorPlans } from '../../utils/floorPlans';
import type { BuildingShape } from '../../types/BuildingShape';
import type { ListRenderItemInfo } from 'react-native';
import { indoorBuildingSheetStyles } from '../../styles/IndoorBottomSheet.styles';
import {
  getIndoorBuildingKeysWithMetadata,
  indoorBuildingMetadata,
} from '../../utils/indoor/buildingMetadata';

export type IndoorBottomSheetRef = {
  open: () => void;
  close: () => void;
};
type Props = {
  onPressBuilding?: (b: BuildingShape) => void;
  reOpenSearchBar?: () => void;
};
const SearchBarCompat = SearchBar as React.ComponentType<any>;

const IndoorBottomSheet = forwardRef<IndoorBottomSheetRef, Props>(
  ({ onPressBuilding, reOpenSearchBar }, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const [search, setSearch] = useState('');

    const snapPoints = useMemo(() => ['25%', '65%'], []);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.expand(),
      close: () => sheetRef.current?.close(),
    }));

    const buildings = getIndoorBuildingKeysWithMetadata(getFloorPlans()).map((code) => ({
      id: code,
      shortCode: code,
      name: indoorBuildingMetadata[code].name,
      address: indoorBuildingMetadata[code].address,
      campus: indoorBuildingMetadata[code].campus,
      polygons: [],
    }));

    const searchableBuildings = useMemo(
      () =>
        buildings.map((building) => ({
          building,
          normalizedSearchText: `${building.name}`.toLowerCase(),
        })),
      [buildings],
    );

    const filtered = useMemo(() => {
      const searchCriteria = search.trim().toLowerCase();
      if (!searchCriteria) return buildings;

      return searchableBuildings
        .filter(({ normalizedSearchText }) => normalizedSearchText.includes(searchCriteria))
        .map(({ building }) => building);
    }, [search, buildings, searchableBuildings]);

    const renderBuildingItem = useCallback(
      ({ item }: ListRenderItemInfo<BuildingShape>) => (
        <TouchableOpacity
          style={indoorBuildingSheetStyles.buildingPill}
          activeOpacity={0.45}
          onPress={() => onPressBuilding?.(item)}
        >
          <View style={searchBuilding.iconWrap}>
            <Ionicons name="location-outline" size={42} color="#F5F1F2" />
          </View>

          <View style={searchBuilding.textWrap}>
            <Text style={searchBuilding.buildingName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={searchBuilding.buildingAddress} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        </TouchableOpacity>
      ),
      [onPressBuilding],
    );

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        backgroundStyle={indoorBuildingSheetStyles.sheetBackground}
        handleIndicatorStyle={indoorBuildingSheetStyles.handle}
        enablePanDownToClose={true}
        enableHandlePanningGesture={true}
        enableContentPanningGesture={true}
        enableDynamicSizing={false}
        onClose={reOpenSearchBar}
      >
        <View style={searchBuilding.screen}>
          <SearchBarCompat
            placeholder="Change building..."
            onChangeText={(text: string) => setSearch(text)}
            value={search}
            platform="default"
            containerStyle={indoorBuildingSheetStyles.searchOuter}
            inputContainerStyle={indoorBuildingSheetStyles.searchInner}
            inputStyle={indoorBuildingSheetStyles.searchText}
            placeholderTextColor={'#ffffffc9'}
            leftIconContainerStyle={{ opacity: 0.9, paddingLeft: 2 }}
            searchIcon={{ name: 'search', type: 'ionicon', size: 25, color: '#d7c9cf' }}
          />
          <BottomSheetFlatList<BuildingShape>
            data={filtered}
            keyExtractor={(item: BuildingShape) => item.id}
            contentContainerStyle={[indoorBuildingSheetStyles.listContent, { paddingBottom: 250 }]}
            renderItem={renderBuildingItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={true}
            nestedScrollEnabled
          />
        </View>
      </BottomSheet>
    );
  },
);

export default IndoorBottomSheet;
