import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorControls from '../src/components/indoor/IndoorControls';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

const mockBuilding = {
  shortCode: 'H',
  name: 'Hall Building',
};

describe('IndoorControls FULL COVERAGE', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor={2}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    expect(getByTestId('indoor-controls')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('H (Hall Building)')).toBeTruthy();
  });

  it('calls onFloorUp and onFloorDown', () => {
    const up = jest.fn();
    const down = jest.fn();

    const { getByTestId } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onFloorUp={up}
        onFloorDown={down}
        openAvailableBuildings={jest.fn()}
        currentFloor={1}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    fireEvent.press(getByTestId('floor-up'));
    fireEvent.press(getByTestId('floor-down'));

    expect(up).toHaveBeenCalled();
    expect(down).toHaveBeenCalled();
  });

  it('opens building list', () => {
    const open = jest.fn();

    const { getByTestId } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={open}
        currentFloor={1}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    fireEvent.press(getByTestId('building-button'));
    expect(open).toHaveBeenCalled();
  });

  it('calls onExitIndoor', () => {
    const exit = jest.fn();

    const { getByTestId } = render(
      <IndoorControls
        onExitIndoor={exit}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor={1}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    fireEvent.press(getByTestId('exit-button'));
    expect(exit).toHaveBeenCalled();
  });

  it('calls onOpenCalendar when enabled', () => {
    const calendar = jest.fn();

    const { getByTestId } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onOpenCalendar={calendar}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor={1}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    fireEvent.press(getByTestId('calendar-button'));
    expect(calendar).toHaveBeenCalled();
  });

  it('does NOT call onOpenCalendar when disabled', () => {
    const calendar = jest.fn();

    const { getByTestId } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onOpenCalendar={calendar}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor={1}
        building={mockBuilding as any}
        isIndoorSheetOpen={true}
      />,
    );

    fireEvent.press(getByTestId('calendar-button'));
    expect(calendar).not.toHaveBeenCalled();
  });

  it('renders null and string floor', () => {
    const { getByText, rerender } = render(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor={null}
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    expect(getByText('')).toBeTruthy();

    rerender(
      <IndoorControls
        onExitIndoor={jest.fn()}
        onFloorUp={jest.fn()}
        onFloorDown={jest.fn()}
        openAvailableBuildings={jest.fn()}
        currentFloor="G"
        building={mockBuilding as any}
        isIndoorSheetOpen={false}
      />,
    );

    expect(getByText('G')).toBeTruthy();
  });
});
