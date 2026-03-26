import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoomList, { RoomNode } from '../src/components/indoor/RoomList';

/* ---------- MOCKS ---------- */

// Bottom sheet → FlatList
jest.mock('@gorhom/bottom-sheet', () => {
  const { FlatList } = require('react-native');
  return { BottomSheetFlatList: FlatList };
});

// Icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// JSON data
jest.mock('../src/assets/floor_plans_json/hall.json', () => ({
  nodes: [
    { id: '1', label: 'H-101', type: 'room', floor: 2, buildingId: 'Hall' },
    { id: '2', label: 'H-102', type: 'room', floor: 1, buildingId: 'Hall' },
    { id: '3', label: 'IGNORE', type: 'hallway', floor: 1, buildingId: 'Hall' }, // ignored
  ],
}));

jest.mock('../src/assets/floor_plans_json/ve.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/vl_floors_combined.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/cc1.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/mb_floors_combined.json', () => ({ nodes: [] }));

/* ---------- TESTS ---------- */

describe('RoomList FULL COVERAGE', () => {
  it('renders all buildings', () => {
    const { getByText } = render(<RoomList />);
    expect(getByText(/CC Building/i)).toBeTruthy();
    expect(getByText(/H Building/i)).toBeTruthy();
    expect(getByText(/VE Building/i)).toBeTruthy();
  });

  it('opens building (non-search) and loads cache', () => {
    const { getByText, queryByText } = render(<RoomList />);

    expect(queryByText('H-101')).toBeNull();

    fireEvent.press(getByText(/H Building/i));

    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('H-102')).toBeTruthy();
  });

  it('toggles building open/close (non-search)', () => {
    const { getByText, queryByText } = render(<RoomList />);

    const building = getByText(/H Building/i);

    fireEvent.press(building);
    expect(getByText('H-101')).toBeTruthy();

    fireEvent.press(building);
    expect(queryByText('H-101')).toBeNull();
  });

  it('calls onSelectRoom when room pressed', () => {
    const mockFn = jest.fn();

    const { getByText } = render(<RoomList onSelectRoom={mockFn} />);

    fireEvent.press(getByText(/H Building/i));
    fireEvent.press(getByText('H-101'));

    expect(mockFn).toHaveBeenCalledTimes(1);

    const called: RoomNode = mockFn.mock.calls[0][0];
    expect(called.label).toBe('H-101');
    expect(called.floor).toBe(2);
    expect(called.buildingKey).toBe('H');
    expect(called.campus).toBe('SGW');
  });

  it('preloads data in search mode', () => {
    const { getByText } = render(<RoomList search="101" />);

    // auto open
    expect(getByText('H-101')).toBeTruthy();
  });

  it('filters rooms correctly (search)', () => {
    const { getByText, queryByText } = render(<RoomList search="101" />);

    expect(getByText('H-101')).toBeTruthy();
    expect(queryByText('H-102')).toBeNull();
  });

  it('search works with label prefix', () => {
    const { getByText } = render(<RoomList search="h-" />);
    expect(getByText('H-101')).toBeTruthy();
  });

  it('collapses building in search mode', () => {
    const { getByText, queryByText } = render(<RoomList search="1" />);

    const building = getByText(/H Building/i);

    // initially open
    expect(getByText('H-101')).toBeTruthy();

    fireEvent.press(building);
    expect(queryByText('H-101')).toBeNull();

    fireEvent.press(building);
    expect(getByText('H-101')).toBeTruthy();
  });

  it('handles empty search results', () => {
    const { queryByText } = render(<RoomList search="9999" />);
    expect(queryByText('H-101')).toBeNull();
  });

  it('sorts floors numerically', () => {
    const { getAllByText } = render(<RoomList />);

    fireEvent.press(getAllByText(/H Building/i)[0]);

    const floors = getAllByText(/Floor/);

    // Floor 1 should appear before Floor 2
    expect(floors[0].props.children.join('')).toContain('1');
  });

  it('ignores non-room nodes', () => {
    const { getByText, queryByText } = render(<RoomList />);

    fireEvent.press(getByText(/H Building/i));

    expect(getByText('H-101')).toBeTruthy();
    expect(queryByText('IGNORE')).toBeNull();
  });

  it('clears cache when search is removed', () => {
    const { rerender, queryByText } = render(<RoomList search="101" />);

    expect(queryByText('H-101')).toBeTruthy();

    rerender(<RoomList search="" />);

    // cache reset → nothing visible until opened
    expect(queryByText('H-101')).toBeNull();
  });
});
