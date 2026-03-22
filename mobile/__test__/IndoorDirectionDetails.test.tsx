import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndoorDirectionDetails from '../src/components/indoor/IndoorDirectionDetails';

/* ---------- MOCKS ---------- */

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  FontAwesome: 'FontAwesome',
}));

jest.mock('react-native-paper', () => ({
  Divider: 'Divider',
}));

/* ---------- TESTS ---------- */

describe('IndoorDirectionDetails FULL COVERAGE', () => {
  it('renders header and buttons', () => {
    const { getByText, getByTestId } = render(
      <IndoorDirectionDetails onClose={jest.fn()} startRoom={null} destinationRoom={null} />,
    );

    expect(getByText(/Directions/i)).toBeTruthy();
    expect(getByTestId('directions-close-button')).toBeTruthy();
  });

  it('shows fallback text when start/destination are null', () => {
    const { getByText } = render(
      <IndoorDirectionDetails onClose={jest.fn()} startRoom={null} destinationRoom={null} />,
    );

    expect(getByText('Set as starting point')).toBeTruthy();
    expect(getByText('Set destination')).toBeTruthy();
  });

  it('renders provided start and destination', () => {
    const { getByText } = render(
      <IndoorDirectionDetails onClose={jest.fn()} startRoom="H-101" destinationRoom="H-202" />,
    );

    expect(getByText('H-101')).toBeTruthy();
    expect(getByText('H-202')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const mockClose = jest.fn();

    const { getByTestId } = render(
      <IndoorDirectionDetails onClose={mockClose} startRoom={null} destinationRoom={null} />,
    );

    fireEvent.press(getByTestId('directions-close-button'));

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('calls onPressStart and onPressDestination', () => {
    const mockStart = jest.fn();
    const mockDest = jest.fn();

    const { getByTestId } = render(
      <IndoorDirectionDetails
        onClose={jest.fn()}
        startRoom={null}
        destinationRoom={null}
        onPressStart={mockStart}
        onPressDestination={mockDest}
      />,
    );

    fireEvent.press(getByTestId('start-location-button'));
    fireEvent.press(getByTestId('destination-location-button'));

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockDest).toHaveBeenCalledTimes(1);
  });

  it('default mode is walking', () => {
    const { getByTestId } = render(
      <IndoorDirectionDetails onClose={jest.fn()} startRoom={null} destinationRoom={null} />,
    );

    expect(getByTestId('transport-walk').props.accessibilityState.selected).toBe(true);
  });

  it('switches travel mode', () => {
    const mockChange = jest.fn();

    const { getByTestId } = render(
      <IndoorDirectionDetails
        onClose={jest.fn()}
        startRoom={null}
        destinationRoom={null}
        onTravelModeChange={mockChange}
      />,
    );

    fireEvent.press(getByTestId('transport-car'));

    expect(mockChange).toHaveBeenCalledWith('disability');
  });

  it('updates selected mode visually', () => {
    const { getByTestId } = render(
      <IndoorDirectionDetails onClose={jest.fn()} startRoom={null} destinationRoom={null} />,
    );

    fireEvent.press(getByTestId('transport-car'));

    expect(getByTestId('transport-car').props.accessibilityState.selected).toBe(true);
  });

  it('respects selectedTravelMode prop', () => {
    const { getByTestId } = render(
      <IndoorDirectionDetails
        onClose={jest.fn()}
        startRoom={null}
        destinationRoom={null}
        selectedTravelMode="disability"
      />,
    );

    expect(getByTestId('transport-car').props.accessibilityState.selected).toBe(true);
  });

  it('updates when selectedTravelMode prop changes', () => {
    const { rerender, getByTestId } = render(
      <IndoorDirectionDetails
        onClose={jest.fn()}
        startRoom={null}
        destinationRoom={null}
        selectedTravelMode="walking"
      />,
    );

    rerender(
      <IndoorDirectionDetails
        onClose={jest.fn()}
        startRoom={null}
        destinationRoom={null}
        selectedTravelMode="disability"
      />,
    );

    expect(getByTestId('transport-car').props.accessibilityState.selected).toBe(true);
  });
});
