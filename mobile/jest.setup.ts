import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage for tests that use it
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mock Expo Location for screens/hooks that request permissions on mount.
jest.mock('expo-location', () => ({
  Accuracy: {
    Balanced: 3,
  },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  watchPositionAsync: jest.fn(async () => ({
    remove: jest.fn(),
  })),
}));

jest.mock('expo-calendar', () => ({
  EntityTypes: {
    EVENT: 'event',
  },
  getCalendarPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  requestCalendarPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
    granted: true,
    canAskAgain: true,
  })),
  getCalendarsAsync: jest.fn(async () => []),
  getEventsAsync: jest.fn(async () => []),
}));

// Silence known RN deprecation warning in tests (SafeAreaView).
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.includes('SafeAreaView has been deprecated')) {
    return;
  }
  originalWarn(...args);
};

// Silence a known React test warning caused by mocked async route updates in BottomSheet tests.
// Test assertions still validate the behavior; this only removes noisy console output.
const originalError = console.error;
console.error = (...args: unknown[]) => {
  const first = args[0];
  const joined = args.map((arg) => String(arg)).join(' ');
  if (
    (typeof first === 'string' && first.includes('not wrapped in act(...)')) ||
    (joined.includes('not wrapped in act(...)') && joined.includes('ForwardRef'))
  ) {
    return;
  }
  originalError(...args);
};
