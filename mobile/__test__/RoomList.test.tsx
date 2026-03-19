import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RoomList, { RoomNode } from '../src/components/indoor/RoomList';

jest.mock('@gorhom/bottom-sheet', () => {
  const { FlatList } = require('react-native');
  return {
    BottomSheetFlatList: FlatList,
  };
});

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../src/assets/floor_plans_json/hall.json', () => ({
  nodes: [
    { id: '1', label: 'H-101', type: 'room', floor: 1, buildingId: 'Hall' },
    { id: '2', label: 'H-102', type: 'room', floor: 1, buildingId: 'Hall' },
  ],
}));

jest.mock('../src/assets/floor_plans_json/ve.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/vl_floors_combined.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/cc1.json', () => ({ nodes: [] }));
jest.mock('../src/assets/floor_plans_json/mb_floors_combined.json', () => ({ nodes: [] }));

describe('RoomList', () => {
  it('renders buildings', () => {
    const { getByText } = render(<RoomList />);
    expect(getByText(/CC Building/i)).toBeTruthy();
    expect(getByText(/H Building/i)).toBeTruthy();
  });

  it('opens building and shows rooms when pressed (non-search mode)', () => {
    const { getByText, queryByText } = render(<RoomList />);

    expect(queryByText('H-101')).toBeNull();

    fireEvent.press(getByText(/H Building/i));

    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('H-102')).toBeTruthy();
  });

  it('calls onSelectRoom when a room is pressed', () => {
    const mockSelect = jest.fn();

    const { getByText } = render(<RoomList onSelectRoom={mockSelect} />);

    fireEvent.press(getByText(/H Building/i));
    fireEvent.press(getByText('H-101'));

    expect(mockSelect).toHaveBeenCalledTimes(1);

    const calledWith: RoomNode = mockSelect.mock.calls[0][0];

    expect(calledWith.label).toBe('H-101');
    expect(calledWith.floor).toBe(1);
  });

  it('filters rooms when searching (auto-open)', () => {
    const { getByText, queryByText } = render(<RoomList search="101" />);

    // DO NOT press building — already open
    expect(getByText('H-101')).toBeTruthy();
    expect(queryByText('H-102')).toBeNull();
  });

  it('collapses building in search mode', () => {
    const { getByText, queryByText } = render(<RoomList search="1" />);

    const building = getByText(/H Building/i);

    // initially OPEN (search mode)
    expect(getByText('H-101')).toBeTruthy();

    // press → collapse
    fireEvent.press(building);
    expect(queryByText('H-101')).toBeNull();

    // press again → expand
    fireEvent.press(building);
    expect(getByText('H-101')).toBeTruthy();
  });
});