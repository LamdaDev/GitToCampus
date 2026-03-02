import { render, fireEvent } from '@testing-library/react-native';
import BuildingDetails from '../src/components/BuildingDetails';
import type { BuildingShape } from '../src/types/BuildingShape';
import React from 'react';

const mockOnClose = jest.fn();
const mockOnShowDirections = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    polygons: [],
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    images: [
      'https://iili.io/qqTLZpR.png',
      'https://iili.io/qqTsrUG.jpg',
      'https://iili.io/qqTZzoN.jpg',
    ],
    services: {
      'Concordia Multi-Faith and Spirituality Centre':
        'https://www.concordia.ca/equity/spirituality.html',
    },
    shortCode: 'FC',
    address: '7141 Sherbrooke West',
  },
  {
    polygons: [],
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: '1515 Ste-Catherine W',
    images: [
      'https://iili.io/qqTLZpR.png',
      'https://iili.io/qqTsrUG.jpg',
      'https://iili.io/qqTZzoN.jpg',
    ],
  },
];

// Icons cause issues during test as they are loaded asynchronously
jest.mock('@expo/vector-icons', () => {
  return {
    Ionicons: (props: any) => <span {...props} />,
    Feather: (props: any) => <span {...props} />,
    MaterialIcons: (props: any) => <span {...props} />,
    FontAwesome: (props: any) => <span {...props} />,
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const actual = jest.requireActual('@gorhom/bottom-sheet');
  return {
    ...actual,
    BottomSheetFlatList: ({ data, renderItem }) => {
      // Simulate rendering each item without throwing
      if (Array.isArray(data)) {
        return data.map((item, index) => renderItem({ item, index, separators: {} }));
      }
      return null;
    },
    useBottomSheetInternal: jest.fn(() => ({})), // prevents hook error
  };
});

describe('Building Details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Retrieve building details on the selected building', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    expect(getByText('FC Building')).toBeTruthy();
    expect(getByText('7141 Sherbrooke West')).toBeTruthy();
  });

  test('Services are absent when the building has none', () => {
    const selectedBuilding = mockBuildings[1];

    const { getByText, queryByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    expect(getByText('EV Building')).toBeTruthy();
    expect(queryByText('Services')).toBeNull();
  });

  test('"Start From" button calls onShowDirections with building as start', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    const setStartButton = getByText('Start From');
    fireEvent.press(setStartButton);

    expect(mockOnShowDirections).toHaveBeenCalledWith(selectedBuilding, false);
    expect(mockOnShowDirections).toHaveBeenCalledTimes(1);
  });

  test('Walking figure button calls onShowDirections with building as destination', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    fireEvent.press(getByText('Directions To'));

    expect(mockOnShowDirections).toHaveBeenCalledWith(selectedBuilding, true);
    expect(mockOnShowDirections).toHaveBeenCalledTimes(1);
  });

  test('navigation buttons do not call onShowDirections when selectedBuilding is null', () => {
    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={null}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    fireEvent.press(getByText('Directions To'));
    fireEvent.press(getByText('Start From'));

    expect(mockOnShowDirections).not.toHaveBeenCalled();
  });

  test('renders carousel images when selectedBuilding has images', () => {
    const selectedBuilding = mockBuildings[0];

    const { getAllByTestId } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    const images = getAllByTestId('carousel-image');

    expect(images).toHaveLength(selectedBuilding.images.length);

    images.forEach((img, index) => {
      expect(img.props.source).toEqual({ uri: selectedBuilding.images[index] });
    });
  });

  test('renders services and opens URL when pressed', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails
        selectedBuilding={selectedBuilding}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    expect(getByText('Services')).toBeTruthy();

    const serviceButton = getByText('Concordia Multi-Faith and Spirituality Centre');

    expect(serviceButton).toBeTruthy();
  });
  test('carousel images update when selected building changes', () => {
    const { getAllByTestId, rerender } = render(
      <BuildingDetails
        selectedBuilding={mockBuildings[0]}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    let images = getAllByTestId('carousel-image');
    expect(images).toHaveLength(mockBuildings[0].images.length);
    images.forEach((img, index) => {
      expect(img.props.source).toEqual({ uri: mockBuildings[0].images[index] });
    });

    rerender(
      <BuildingDetails
        selectedBuilding={mockBuildings[1]}
        onClose={mockOnClose}
        onShowDirections={mockOnShowDirections}
        currentBuilding={null}
        userLocation={null}
      />,
    );

    images = getAllByTestId('carousel-image');
    expect(images).toHaveLength(mockBuildings[1].images.length);
    images.forEach((img, index) => {
      expect(img.props.source).toEqual({ uri: mockBuildings[1].images[index] });
    });
  });
});
