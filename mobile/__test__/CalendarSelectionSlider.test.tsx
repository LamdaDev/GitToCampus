import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CalendarSelectionSlider from '../src/components/CalendarSelectionSlider';
import * as googleCalendarAuth from '../src/services/googleCalendarAuth';

const mockGoogleCalendars = [
  {
    id: 'primary-calendar',
    name: 'Work Schedule',
    accessRole: 'owner',
    isPrimary: true,
  },
  {
    id: 'winter-calendar',
    name: 'Winter Schedule',
    accessRole: 'reader',
    isPrimary: false,
  },
];

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});

jest.mock('../src/services/googleCalendarAuth', () => ({
  fetchGoogleCalendarListAsync: jest.fn(async () => ({
    type: 'success',
    calendars: [],
  })),
}));

describe('CalendarSelectionSlider', () => {
  const fetchGoogleCalendarListMock = googleCalendarAuth.fetchGoogleCalendarListAsync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchGoogleCalendarListMock.mockResolvedValue({
      type: 'success',
      calendars: [],
    });
  });

  test('loads and renders calendar options when fetch succeeds', async () => {
    fetchGoogleCalendarListMock.mockResolvedValueOnce({
      type: 'success',
      calendars: mockGoogleCalendars,
    });

    const { getByTestId, findByTestId } = render(<CalendarSelectionSlider />);

    expect(getByTestId('calendar-selection-slider')).toBeTruthy();
    expect(getByTestId('calendar-selection-title')).toHaveTextContent('Select Calendars:');
    expect(await findByTestId('calendar-option-primary-calendar')).toBeTruthy();
    expect(getByTestId('calendar-option-winter-calendar')).toBeTruthy();
  });

  test('allows selecting multiple calendars', async () => {
    fetchGoogleCalendarListMock.mockResolvedValueOnce({
      type: 'success',
      calendars: mockGoogleCalendars,
    });

    const { getByTestId, findByTestId, getAllByText } = render(<CalendarSelectionSlider />);
    expect(await findByTestId('calendar-option-winter-calendar')).toBeTruthy();
    expect(getAllByText('checkbox-outline')).toHaveLength(1);

    fireEvent.press(getByTestId('calendar-option-winter-calendar'));
    expect(getAllByText('checkbox-outline')).toHaveLength(2);

    fireEvent.press(getByTestId('calendar-option-primary-calendar'));
    expect(getAllByText('checkbox-outline')).toHaveLength(1);
  });

  test('keeps only provided selected calendars checked when reopened', async () => {
    fetchGoogleCalendarListMock.mockResolvedValueOnce({
      type: 'success',
      calendars: mockGoogleCalendars,
    });

    const onDone = jest.fn();
    const { getByTestId, findByTestId, getAllByText } = render(
      <CalendarSelectionSlider
        initialSelectedCalendarIds={['winter-calendar']}
        onDone={onDone}
      />,
    );

    expect(await findByTestId('calendar-option-winter-calendar')).toBeTruthy();
    expect(getAllByText('checkbox-outline')).toHaveLength(1);

    fireEvent.press(getByTestId('calendar-selection-done-button'));
    expect(onDone).toHaveBeenCalledWith(['winter-calendar']);
  });

  test('shows error and retries loading', async () => {
    fetchGoogleCalendarListMock
      .mockResolvedValueOnce({
        type: 'error',
        message: 'Unable to load calendar list right now. Please retry.',
      })
      .mockResolvedValueOnce({
        type: 'success',
        calendars: mockGoogleCalendars,
      });

    const { getByTestId, findByTestId } = render(<CalendarSelectionSlider />);

    expect(await findByTestId('calendar-list-error')).toHaveTextContent(
      'Unable to load calendar list right now. Please retry.',
    );

    fireEvent.press(getByTestId('retry-calendar-list-button'));
    await waitFor(() => expect(fetchGoogleCalendarListMock).toHaveBeenCalledTimes(2));
    expect(getByTestId('calendar-option-primary-calendar')).toBeTruthy();
  });

  test('calls onDone when done button is pressed', async () => {
    const onDone = jest.fn();
    const { getByTestId } = render(<CalendarSelectionSlider onDone={onDone} />);

    await waitFor(() => expect(fetchGoogleCalendarListMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('calendar-selection-done-button'));

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is pressed', async () => {
    const onClose = jest.fn();
    const { getByTestId } = render(<CalendarSelectionSlider onClose={onClose} />);

    await waitFor(() => expect(fetchGoogleCalendarListMock).toHaveBeenCalledTimes(1));
    fireEvent.press(getByTestId('close-calendar-selection-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
