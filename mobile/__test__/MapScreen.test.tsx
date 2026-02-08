import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Polygon } from 'react-native-maps';
import MapScreen from '../src/screens/MapScreen';
import type { BuildingShape } from '../src/types/BuildingShape';

const mockPassSelectedBuildings = jest.fn();
const mockOpenBottomSheet = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    id: 'sgw-1',
    campus: 'SGW',
    name: 'Hall Building',
    polygons: [
      [
        { latitude: 45.5, longitude: -73.57 },
        { latitude: 45.5, longitude: -73.58 },
        { latitude: 45.51, longitude: -73.58 },
      ],
    ],
  },
  {
    id: 'loy-1',
    campus: 'LOYOLA',
    name: 'Administration',
    polygons: [
      [
        { latitude: 45.52, longitude: -73.59 },
        { latitude: 45.52, longitude: -73.6 },
        { latitude: 45.53, longitude: -73.6 },
      ],
      [
        { latitude: 45.54, longitude: -73.61 },
        { latitude: 45.54, longitude: -73.62 },
        { latitude: 45.55, longitude: -73.62 },
      ],
    ],
  },
];

jest.mock('../src/utils/buildingsRepository', () => ({
  getCampusBuildingShapes: (campus: 'SGW' | 'LOYOLA') =>
    mockBuildings.filter((b) => b.campus === campus),
  getBuildingShapeById: (id: string) => mockBuildings.find((b) => b.id === id),
}));

describe('MapScreen', () => {
  test('renders overlay with default camera target and prompt', () => {
    const { getByText } = render(<MapScreen passSelectedBuilding={mockPassSelectedBuildings} openBottomSheet={mockOpenBottomSheet} />);

    expect(getByText('GitToCampus')).toBeTruthy();
    expect(getByText('Camera target: SGW')).toBeTruthy();
    expect(getByText('Tap a building')).toBeTruthy();
  });

  test('renders one polygon per building polygon', () => {
    const { UNSAFE_getAllByType } = render(<MapScreen passSelectedBuilding={mockPassSelectedBuildings} openBottomSheet={mockOpenBottomSheet} />);

    const polygons = UNSAFE_getAllByType(Polygon);
    expect(polygons).toHaveLength(3);
  });

  test('selecting a polygon updates selected building and camera target', () => {
    const { getByText, queryByText, UNSAFE_getAllByType } = render(<MapScreen passSelectedBuilding={mockPassSelectedBuildings} openBottomSheet={mockOpenBottomSheet} />);

    const polygons = UNSAFE_getAllByType(Polygon);
    // First polygon is SGW, next polygons are Loyola
    fireEvent(polygons[1], 'press');

    expect(getByText('Camera target: LOYOLA')).toBeTruthy();
    expect(getByText('Selected: Administration')).toBeTruthy();
    expect(queryByText('Tap a building')).toBeNull();
  });
});
