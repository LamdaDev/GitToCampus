import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import BottomSheet from '../src/components/BottomSheet';
import App from '../src/App';

const mockUseFonts = jest.fn(() => [true]);
const mockInitializeClarityAsync = jest.fn(async () => {});
const mockCloseCalendarSlider = jest.fn();
const mockBottomSheetOpen = jest.fn();
const mockOpenCalendarEventsSlider = jest.fn();
const mockGetStoredGoogleCalendarSessionState = jest.fn(async () => ({
  status: 'not_connected',
  session: null,
}));
const mockFetchGoogleCalendarListAsync = jest.fn(async () => ({
  type: 'success',
  calendars: [],
}));

// Mock GestureHandlerView needed for BottomSheet
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }) => <View>{children}</View>,
  };
});

// Mock fonts as they are loaded asynchronously and cause issues
jest.mock('expo-font', () => ({
  useFonts: () => mockUseFonts(),
}));

jest.mock('../src/components/BottomSheet', () => {
  const React = require('react');
  const { TouchableOpacity, View, Text } = require('react-native');

  const MockBottomSheet = React.forwardRef(function MockBottomSheet(
    { revealSearchBar, onExitSearch },
    ref,
  ) {
    React.useImperativeHandle(ref, () => ({
      open: mockBottomSheetOpen,
      closeCalendarSlider: mockCloseCalendarSlider,
      openCalendarEventsSlider: mockOpenCalendarEventsSlider,
    }));
    return (
      <View testID="bottom-sheet">
        <TouchableOpacity testID="reveal-search-bar" onPress={revealSearchBar}>
          <Text>Reveal</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="exit-search-mode" onPress={onExitSearch}>
          <Text>Exit</Text>
        </TouchableOpacity>
      </View>
    );
  });
  return MockBottomSheet;
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }) => <Text>{name}</Text>,
  };
});

const mockOpenBottomSheet = jest.fn();

jest.mock('../src/screens/MapScreen', () => {
  const { TouchableOpacity, View, Text, Button } = require('react-native');

  return function MockMapScreen({
    openBottomSheet,
    passSelectedBuilding,
    onMapPress,
    onOpenCalendar,
  }) {
    return (
      <View testID="map-screen">
        <Button testID="open-sheet" title="Open" onPress={mockOpenBottomSheet} />
        {/* NEW: actually wires up the real prop so openBuildingDetails fires */}
        <TouchableOpacity testID="open-detail-sheet" onPress={openBottomSheet}>
          <Text>Open Detail</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="select-building"
          onPress={() => passSelectedBuilding({ id: 'b1' })}
        >
          <Text>Select</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="press-map-background" onPress={onMapPress}>
          <Text>Press Map</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="open-calendar-shortcut" onPress={onOpenCalendar}>
          <Text>Calendar Shortcut</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../src/utils/buildingsRepository', () => ({
  getAllBuildingShapes: jest.fn(() => [{ id: 'test-building', name: 'Test Hall' }]),
}));

jest.mock('../src/components/AppSearchBar', () => {
  const { TouchableOpacity, View, Text } = require('react-native');

  return function MockAppSearchBar({ openSearch }) {
    return (
      <View testID="search-bar">
        <TouchableOpacity testID="open-search" onPress={openSearch}>
          <Text>Search</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

jest.mock('../src/services/clarity', () => ({
  initializeClarityAsync: () => mockInitializeClarityAsync(),
}));

jest.mock('../src/services/googleCalendarAuth', () => ({
  getStoredGoogleCalendarSessionState: () => mockGetStoredGoogleCalendarSessionState(),
  fetchGoogleCalendarListAsync: () => mockFetchGoogleCalendarListAsync(),
}));

describe('App', () => {
  beforeEach(() => {
    mockUseFonts.mockReturnValue([true]);
    mockInitializeClarityAsync.mockClear();
    mockCloseCalendarSlider.mockClear();
    mockBottomSheetOpen.mockClear();
    mockOpenCalendarEventsSlider.mockClear();
    mockGetStoredGoogleCalendarSessionState.mockResolvedValue({
      status: 'not_connected',
      session: null,
    });
    mockFetchGoogleCalendarListAsync.mockResolvedValue({
      type: 'success',
      calendars: [],
    });
  });

  test('renders MapScreen inside SafeAreaView', () => {
    const { UNSAFE_getByType, getByTestId } = render(<App />);
    const mapScreen = UNSAFE_getByType(MapScreen);
    const bottomSheet = UNSAFE_getByType(BottomSheet);

    // Check if MapScreen has been rendered successfully
    expect(mapScreen).toBeTruthy();
    expect(getByTestId('map-screen')).toBeTruthy();

    // Check if BottomSheet has been rendered successfully
    expect(bottomSheet).toBeTruthy();

    fireEvent.press(getByTestId('open-sheet'));

    // Check if MapScreen's passed prop has fired
    expect(mockOpenBottomSheet).toHaveBeenCalled();
  });

  test('AppSearchBar visible by default', () => {
    const { getByTestId } = render(<App />);

    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('openBuildingDetails hides AppSearchBar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-detail-sheet'));

    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('openSearchBuilding hides AppSearchBar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-search'));

    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('toggleSearchBarState restores AppSearchBar', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-detail-sheet'));
    fireEvent.press(getByTestId('reveal-search-bar'));

    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('exitSearchMode does not throw', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-search'));

    expect(() => fireEvent.press(getByTestId('exit-search-mode'))).not.toThrow();
  });

  test('passSelectedBuilding updates state', () => {
    const { getByTestId } = render(<App />);

    expect(() => fireEvent.press(getByTestId('select-building'))).not.toThrow();
  });

  test('returns null while fonts are loading', () => {
    mockUseFonts.mockReturnValue([false]);

    const { queryByTestId } = render(<App />);
    expect(queryByTestId('map-screen')).toBeNull();
  });

  test('initializes Clarity at startup', () => {
    render(<App />);
    expect(mockInitializeClarityAsync).toHaveBeenCalledTimes(1);
  });

  test('map presses dismiss calendar sliders via bottom sheet handle', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('press-map-background'));

    expect(mockCloseCalendarSlider).toHaveBeenCalledTimes(1);
  });

  test('calendar shortcut opens search sheet when Google Calendar is not connected', async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => expect(mockBottomSheetOpen).toHaveBeenCalledWith(1));
    expect(mockGetStoredGoogleCalendarSessionState).toHaveBeenCalledTimes(1);
    expect(mockOpenCalendarEventsSlider).not.toHaveBeenCalled();
    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('calendar shortcut opens upcoming classes when Google Calendar is connected', async () => {
    mockGetStoredGoogleCalendarSessionState.mockResolvedValueOnce({
      status: 'connected',
      session: {
        accessToken: 'token',
        tokenType: 'Bearer',
        scope: 'scope',
        expiresAt: Date.now() + 60_000,
      },
    });
    mockFetchGoogleCalendarListAsync.mockResolvedValueOnce({
      type: 'success',
      calendars: [
        { id: 'calendar-1', name: 'Primary', accessRole: 'owner', isPrimary: true },
        { id: 'calendar-2', name: 'Classes', accessRole: 'reader', isPrimary: false },
      ],
    });

    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => {
      expect(mockBottomSheetOpen).toHaveBeenCalledWith(1);
      expect(mockOpenCalendarEventsSlider).toHaveBeenCalledWith(['calendar-1', 'calendar-2']);
    });
  });
});
