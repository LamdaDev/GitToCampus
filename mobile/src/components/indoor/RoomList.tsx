import React, { useState, useCallback, useEffect } from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';

import hall from '../../assets/floor_plans_json/hall.json';
import ve from '../../assets/floor_plans_json/ve.json';
import vl from '../../assets/floor_plans_json/vl_floors_combined.json';
import cc from '../../assets/floor_plans_json/cc1.json';
import mb from '../../assets/floor_plans_json/mb_floors_combined.json';

import { roomListStyles as styles } from '../../styles/RoomList.Styles';
import {
  getIndoorBuildingCampus,
  normalizeIndoorBuildingKey,
  type IndoorBuildingKey,
} from '../../utils/indoor/buildingKeys';

const buildingMeta: Record<IndoorBuildingKey, { name: string; address: string }> = {
  CC: {
    name: 'CC Building',
    address: '7141 Sherbrooke West',
  },
  H: {
    name: 'H Building',
    address: '1450 De Maisonneuve Blvd W.',
  },
  MB: {
    name: 'MB Building',
    address: '1450 Guy Street',
  },
  VE: {
    name: 'VE Building',
    address: '7141 Sherbrooke West',
  },
  VL: {
    name: 'Vanier Library',
    address: '7141 Sherbrooke St W.',
  },
};

export type RoomNode = {
  id: string;
  label: string;
  buildingId: string;
  buildingKey: IndoorBuildingKey;
  campus: ReturnType<typeof getIndoorBuildingCampus>;
  floor: number;
};

type Props = {
  search?: string;
  onSelectRoom?: (room: RoomNode) => void;
  variant?: 'virtualized' | 'static';
};

const buildingGraphs: Record<IndoorBuildingKey, any> = {
  VE: ve,
  VL: vl,
  CC: cc,
  MB: mb,
  H: hall,
};

const buildingIds = Object.keys(buildingGraphs) as IndoorBuildingKey[];

const getBuildingData = (buildingKey: IndoorBuildingKey, search: string) => {
  const graph = buildingGraphs[buildingKey];
  if (!graph) return {};

  const searchLower = search.trim().toLowerCase();

  const grouped: Record<number, RoomNode[]> = {};

  graph.nodes.forEach((node: any) => {
    if (node.type === 'room' && node.label && node.label.trim() !== '') {
      const label = node.label.toLowerCase();

      const roomNumber = label.replace(/[^0-9]/g, '');

      if (!searchLower || roomNumber.startsWith(searchLower) || label.startsWith(searchLower)) {
        if (!grouped[node.floor]) grouped[node.floor] = [];

        const normalizedBuildingKey = normalizeIndoorBuildingKey(node.buildingId) ?? buildingKey;
        grouped[node.floor].push({
          id: node.id,
          label: node.label,
          buildingId: node.buildingId,
          buildingKey: normalizedBuildingKey,
          campus: getIndoorBuildingCampus(normalizedBuildingKey),
          floor: node.floor,
        });
      }
    }
  });

  Object.values(grouped).forEach((rooms) => rooms.sort((a, b) => a.label.localeCompare(b.label)));

  return grouped;
};

const RoomList = ({ onSelectRoom, search = '', variant = 'virtualized' }: Props) => {
  const [openBuilding, setOpenBuilding] = useState<IndoorBuildingKey | null>(null);
  const [buildingCache, setBuildingCache] = useState<
    Partial<Record<IndoorBuildingKey, Record<number, RoomNode[]>>>
  >({});
  const [collapsedBuildings, setCollapsedBuildings] = useState<Set<IndoorBuildingKey>>(new Set());

  const isSearching = search.trim().length > 0;

  // preload when searching
  useEffect(() => {
    if (!isSearching) {
      setBuildingCache({});
      return;
    }

    const newCache: Partial<Record<IndoorBuildingKey, Record<number, RoomNode[]>>> = {};

    buildingIds.forEach((buildingId) => {
      const data = getBuildingData(buildingId, search);

      if (Object.keys(data).length > 0) {
        newCache[buildingId] = data;
      }
    });

    setBuildingCache(newCache);
  }, [search]);

  // reset collapsed state when search changes
  useEffect(() => {
    setCollapsedBuildings(new Set());
  }, [search]);

  const handleToggleBuilding = useCallback(
    (buildingId: IndoorBuildingKey) => {
      if (isSearching) {
        setCollapsedBuildings((prev) => {
          const newSet = new Set(prev);

          if (newSet.has(buildingId)) {
            newSet.delete(buildingId);
          } else {
            newSet.add(buildingId);
          }

          return newSet;
        });
        return;
      }

      setOpenBuilding((prev) => {
        const next = prev === buildingId ? null : buildingId;

        if (next && !buildingCache[next]) {
          const data = getBuildingData(next, '');

          setBuildingCache((prevCache) => ({
            ...prevCache,
            [next]: data,
          }));
        }

        return next;
      });
    },
    [buildingCache, isSearching],
  );

  const renderBuilding = useCallback(
    ({ item: buildingId }: { item: IndoorBuildingKey }) => {
      const floors = buildingCache[buildingId];

      if (isSearching && !floors) return null;

      const isOpen = isSearching
        ? !collapsedBuildings.has(buildingId)
        : openBuilding === buildingId;

      return (
        <View style={styles.buildingContainer}>
          <TouchableOpacity
            onPress={() => handleToggleBuilding(buildingId)}
            style={styles.buildingHeader}
          >
            <Ionicons
              name={isOpen ? 'chevron-down' : 'chevron-forward'}
              size={18}
              color="white"
              style={styles.icon}
            />
            <Ionicons name="location-outline" size={34} color="#F5F1F2" />
            <View>
              <Text style={styles.buildingTitle}>{buildingMeta[buildingId]?.name}</Text>

              <Text style={styles.buildingAddress}>{buildingMeta[buildingId]?.address ?? ''}</Text>
            </View>
          </TouchableOpacity>

          {isOpen && floors && (
            <View style={styles.contentContainer}>
              {Object.entries(floors)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([floor, rooms]) => (
                  <View key={floor} style={{ marginBottom: 12 }}>
                    <Text style={styles.floorTitle}>Floor {floor}</Text>

                    {rooms.map((room) => (
                      <TouchableOpacity
                        key={room.id}
                        onPress={() => onSelectRoom?.(room)}
                        style={styles.roomItem}
                      >
                        <Text style={styles.roomText}>{room.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
            </View>
          )}
        </View>
      );
    },
    [
      openBuilding,
      buildingCache,
      collapsedBuildings,
      handleToggleBuilding,
      isSearching,
      onSelectRoom,
    ],
  );

  if (variant === 'static') {
    return (
      <View style={styles.container}>
        {buildingIds.map((buildingId) => (
          <View key={buildingId}>{renderBuilding({ item: buildingId })}</View>
        ))}
      </View>
    );
  }

  return (
    <BottomSheetFlatList
      data={buildingIds}
      keyExtractor={(id: IndoorBuildingKey) => id}
      renderItem={renderBuilding}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
    />
  );
};

export default RoomList;
