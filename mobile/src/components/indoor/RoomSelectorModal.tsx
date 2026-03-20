import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ListRenderItemInfo,
} from 'react-native';
import type { IndoorNode } from '../../utils/indoor/indoorPathFinding';

type Props = {
  visible: boolean;
  rooms: IndoorNode[];
  title: string;
  onSelect: (room: IndoorNode) => void;
  onClose: () => void;
};

export default function RoomSelectorModal({ visible, rooms, title, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rooms;
    return rooms.filter((r) => r.label.toLowerCase().includes(q));
  }, [search, rooms]);

  const handleSelect = (room: IndoorNode) => {
    onSelect(room);
    setSearch('');
  };

  const renderItem = ({ item }: ListRenderItemInfo<IndoorNode>) => (
    <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
      <Text style={styles.label}>{item.label}</Text>
      <Text style={styles.floor}>Floor {item.floor}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Search room…"
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
          autoFocus
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '600' },
  closeBtn: { color: '#fff', fontSize: 20, padding: 4 },
  input: {
    margin: 12,
    padding: 12,
    backgroundColor: '#2a2a3e',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2a2a3e',
  },
  label: { color: '#fff', fontSize: 15 },
  floor: { color: '#888', fontSize: 13 },
});
