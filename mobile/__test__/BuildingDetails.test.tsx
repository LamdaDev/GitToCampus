import { render } from '@testing-library/react-native';
import BuildingDetails from '../src/components/BuildingDetails';
import type { BuildingShape } from '../src/types/BuildingShape';

const mockOnClose = jest.fn();

const mockBuildings: BuildingShape[] = [
  {
    id: 'sgw-1',
    campus: 'LOYOLA',
    name: 'FC Building',
    hotspots: {
      'Loyola Chapel': 'https://www.concordia.ca/hospitality/venues/loyola-chapel.html',
    },
    services: {
      'Concordia Multi-Faith and Spirituality Centre':
        'https://www.concordia.ca/equity/spirituality.html',
    },
    address: '7141 Sherbrooke West',
  },
  {
    id: 'loy-1',
    campus: 'SGW',
    name: 'EV Building',
    address: '1515 Ste-Catherine W',
  },
];

// Icons cause issues during test as they are loaded asynchronously
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  return {
    Ionicons: (props: any) => <span {...props} />,
    MaterialIcons: (props: any) => <span {...props} />,
    FontAwesome: (props: any) => <span {...props} />,
  };
});

describe('Building Details', () => {
  test('Retrieve building details on the selected building', () => {
    const selectedBuilding = mockBuildings[0];

    const { getByText } = render(
      <BuildingDetails selectedBuilding={selectedBuilding} onClose={mockOnClose} />,
    );

    expect(getByText('FC Building')).toBeTruthy();
    expect(getByText('Loyola Chapel')).toBeTruthy();
    expect(getByText('7141 Sherbrooke West')).toBeTruthy();
  });

  test('Hotspots and Services are absent when the building has none', () => {
    const selectedBuilding = mockBuildings[1];

    const { getByText, queryByText } = render(
      <BuildingDetails selectedBuilding={selectedBuilding} onClose={mockOnClose} />,
    );

    expect(getByText('EV Building')).toBeTruthy();
    expect(queryByText('HotSpots')).toBeNull();
    expect(queryByText('Services')).toBeNull();
  });
});
