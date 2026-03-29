import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorNavigationDetails from '../src/components/indoor/IndoorNavigationDetails';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const baseProps = {
  startRoom: 'H-101',
  destinationRoom: 'H-202',
  pathSteps: [{ icon: '', label: 'Walk down the hallway' }],
  onBack: jest.fn(),
  onClose: jest.fn(),
};

describe('IndoorNavigationDetails', () => {
  it('renders start and destination rooms', () => {
    const { getByText } = render(<IndoorNavigationDetails {...baseProps} />);
    expect(getByText('H-101 → H-202')).toBeTruthy();
  });

  it('renders buildingName when provided', () => {
    const { getByText } = render(
      <IndoorNavigationDetails {...baseProps} buildingName="Hall Building" />,
    );
    expect(getByText('Hall Building')).toBeTruthy();
  });

  it('renders path steps', () => {
    const { getByText } = render(<IndoorNavigationDetails {...baseProps} />);
    expect(getByText('Walk down the hallway')).toBeTruthy();
  });

  it('shows empty state when pathSteps is empty', () => {
    const { getByText } = render(<IndoorNavigationDetails {...baseProps} pathSteps={[]} />);
    expect(getByText('No path found between these rooms.')).toBeTruthy();
  });

  it('renders floor nav buttons when both handlers are provided', () => {
    const { getByText } = render(
      <IndoorNavigationDetails
        {...baseProps}
        pathSteps={[{ icon: '', label: 'Stairs to floor 2' }]}
        onPrevFloor={jest.fn()}
        onNextFloor={jest.fn()}
      />,
    );
    expect(getByText('Prev Floor')).toBeTruthy();
    expect(getByText('Next Floor')).toBeTruthy();
  });

  it('hides floor nav buttons when handlers are missing', () => {
    const { queryByText } = render(
      <IndoorNavigationDetails {...baseProps} startRoom="H-101" destinationRoom="H-110" />,
    );
    expect(queryByText('Prev Floor')).toBeNull();
  });

  it('calls onPrevFloor and onNextFloor when floor buttons are pressed', () => {
    const onPrevFloor = jest.fn();
    const onNextFloor = jest.fn();
    const { getByText } = render(
      <IndoorNavigationDetails
        {...baseProps}
        pathSteps={[{ icon: '', label: 'Stairs to floor 2' }]}
        onPrevFloor={onPrevFloor}
        onNextFloor={onNextFloor}
      />,
    );
    fireEvent.press(getByText('Prev Floor'));
    fireEvent.press(getByText('Next Floor'));
    expect(onPrevFloor).toHaveBeenCalledTimes(1);
    expect(onNextFloor).toHaveBeenCalledTimes(1);
  });

  it('renders the staged route action button and triggers it when provided', () => {
    const onStageAction = jest.fn();
    const { getByTestId, getByText } = render(
      <IndoorNavigationDetails
        {...baseProps}
        stageActionLabel="Continue to Outdoor Directions"
        onStageAction={onStageAction}
      />,
    );

    expect(getByText('Continue to Outdoor Directions')).toBeTruthy();
    fireEvent.press(getByTestId('indoor-stage-action-button'));
    expect(onStageAction).toHaveBeenCalledTimes(1);
  });
});
