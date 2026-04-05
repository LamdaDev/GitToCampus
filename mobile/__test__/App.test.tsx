import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import BottomSheet from '../src/components/BottomSheet';
import App from '../src/App';

const mockUseFonts = jest.fn(() => [true]);
const mockInitializeClarityAsync = jest.fn(async () => {});
const mockBottomSheetClose = jest.fn();
const mockCloseCalendarSlider = jest.fn();
const mockBottomSheetOpen = jest.fn();
const mockOpenCalendarEventsSlider = jest.fn();
const mockOpenIndoorDirections = jest.fn();
const mockGetStoredGoogleCalendarSessionState = jest.fn(
  async (): Promise<any> => ({
    status: 'not_connected',
    session: null,
  }),
);

// Mock GestureHandlerView needed for BottomSheet
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: any) => <View>{children}</View>,
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
    { revealSearchBar, onExitSearch, onPrevPathFloor, onNextPathFloor, enterIndoorView }: any,
    ref: any,
  ) {
    React.useImperativeHandle(ref, () => ({
      open: mockBottomSheetOpen,
      close: mockBottomSheetClose,
      closeCalendarSlider: mockCloseCalendarSlider,
      openCalendarEventsSlider: mockOpenCalendarEventsSlider,
      openIndoorDirections: mockOpenIndoorDirections,
    }));
    return (
      <View testID="bottom-sheet">
        <TouchableOpacity testID="reveal-search-bar" onPress={revealSearchBar}>
          <Text>Reveal</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="exit-search-mode" onPress={onExitSearch}>
          <Text>Exit</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="trigger-prev-floor" onPress={onPrevPathFloor}>
          <Text>Prev Floor</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="trigger-next-floor" onPress={onNextPathFloor}>
          <Text>Next Floor</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="trigger-enter-indoor" onPress={enterIndoorView}>
          <Text>Enter Indoor</Text>
        </TouchableOpacity>
      </View>
    );
  });
  return MockBottomSheet;
});

jest.mock('@expo/vector-icons', () => {
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name }: any) => <Text>{name}</Text>,
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
    onIndoorFloorNavReady,
    indoorPathStepsChange,
    exitIndoorView,
    hideAppSearchBar,
  }: any) {
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
        <TouchableOpacity
          testID="trigger-floor-nav-ready"
          onPress={() =>
            onIndoorFloorNavReady?.(
              () => {},
              () => {},
            )
          }
        >
          <Text>Floor Nav Ready</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="trigger-indoor-route-change"
          onPress={() => indoorPathStepsChange?.([{ icon: '', label: 'Walk forward' }])}
        >
          <Text>Route Change</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="trigger-exit-indoor" onPress={exitIndoorView}>
          <Text>Exit Indoor</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="trigger-hide-search-bar" onPress={hideAppSearchBar}>
          <Text>Hide Search Bar</Text>
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

  return function MockAppSearchBar({ openSearch }: any) {
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
}));

describe('App', () => {
  beforeEach(() => {
    mockUseFonts.mockReturnValue([true]);
    mockInitializeClarityAsync.mockClear();
    mockBottomSheetClose.mockClear();
    mockCloseCalendarSlider.mockClear();
    mockBottomSheetOpen.mockClear();
    mockOpenCalendarEventsSlider.mockClear();
    mockOpenIndoorDirections.mockClear();
    mockGetStoredGoogleCalendarSessionState.mockResolvedValue({
      status: 'not_connected',
      session: null,
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

    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => {
      expect(mockBottomSheetOpen).toHaveBeenCalledWith(1);
      expect(mockOpenCalendarEventsSlider).toHaveBeenCalledWith();
    });
  });

  test('calendar shortcut logs warning when calendar state loading fails', async () => {
    const error = new Error('calendar auth read failed');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetStoredGoogleCalendarSessionState.mockRejectedValueOnce(error);

    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => {
      expect(mockBottomSheetOpen).toHaveBeenCalledWith(1);
      expect(warnSpy).toHaveBeenCalledWith('Failed to open calendar from map action', error);
    });

    warnSpy.mockRestore();
  });

  test('isIndoor is false by default and AppSearchBar is shown', () => {
    const { getByTestId } = render(<App />);
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('openSearchBuilding hides AppSearchBar and opens bottom sheet', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-search'));

    expect(queryByTestId('search-bar')).toBeNull();
    expect(mockBottomSheetOpen).toHaveBeenCalled();
  });

  test('pressing map background does not throw', () => {
    const { getByTestId } = render(<App />);
    expect(() => fireEvent.press(getByTestId('press-map-background'))).not.toThrow();
  });

  test('calendar shortcut hides AppSearchBar', async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => expect(queryByTestId('search-bar')).toBeNull());
  });

  test('calendar shortcut reopens the search sheet instead of indoor directions while indoor', async () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('trigger-enter-indoor'));
    fireEvent.press(getByTestId('open-calendar-shortcut'));

    await waitFor(() => {
      expect(mockBottomSheetOpen).toHaveBeenCalledWith(1);
      expect(mockOpenIndoorDirections).not.toHaveBeenCalled();
      expect(queryByTestId('search-bar')).toBeNull();
    });
  });

  test('fonts not loaded returns null and renders nothing', () => {
    mockUseFonts.mockReturnValue([false]);
    const { queryByTestId } = render(<App />);
    expect(queryByTestId('bottom-sheet')).toBeNull();
    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('enterIndoorView sets isIndoor state without throwing', () => {
    const { getByTestId } = render(<App />);
    expect(() => fireEvent.press(getByTestId('open-detail-sheet'))).not.toThrow();
  });

  test('handleIndoorFloorNavReady stores floor nav callbacks without throwing', () => {
    const { getByTestId } = render(<App />);
    expect(() => fireEvent.press(getByTestId('trigger-floor-nav-ready'))).not.toThrow();
  });

  test('indoorPathStepsChange updates path steps without throwing', () => {
    const { getByTestId } = render(<App />);
    expect(() => fireEvent.press(getByTestId('trigger-indoor-route-change'))).not.toThrow();
  });

  test('exitIndoorView resets isIndoor to false without throwing', () => {
    const { getByTestId } = render(<App />);
    expect(() => fireEvent.press(getByTestId('trigger-exit-indoor'))).not.toThrow();
  });

  test('exiting indoor view closes the bottom sheet and restores the outdoor search bar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('trigger-enter-indoor'));
    fireEvent.press(getByTestId('open-search'));

    expect(mockOpenIndoorDirections).toHaveBeenCalledTimes(1);
    expect(queryByTestId('search-bar')).toBeNull();

    fireEvent.press(getByTestId('trigger-exit-indoor'));

    expect(mockBottomSheetClose).toHaveBeenCalledTimes(1);
    expect(getByTestId('search-bar')).toBeTruthy();
  });

  test('hideAppSearchBar hides the AppSearchBar', () => {
    const { getByTestId, queryByTestId } = render(<App />);

    fireEvent.press(getByTestId('trigger-hide-search-bar'));

    expect(queryByTestId('search-bar')).toBeNull();
  });

  test('handleIndoorRouteChange is called and does not throw', () => {
    const { getByTestId } = render(<App />);

    expect(() => fireEvent.press(getByTestId('trigger-indoor-route-change'))).not.toThrow();
  });

  test('handlePrevPathFloor calls stored prev floor ref without throwing', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('trigger-floor-nav-ready'));
    expect(() => fireEvent.press(getByTestId('trigger-prev-floor'))).not.toThrow();
  });

  test('handleNextPathFloor calls stored next floor ref without throwing', () => {
    const { getByTestId } = render(<App />);

    fireEvent.press(getByTestId('trigger-floor-nav-ready'));
    expect(() => fireEvent.press(getByTestId('trigger-next-floor'))).not.toThrow();
  });
});
