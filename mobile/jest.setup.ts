import "@testing-library/jest-native/extend-expect";

// Mock AsyncStorage for tests that use it
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
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

// Silence known RN deprecation warning in tests (SafeAreaView).
const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  const first = args[0];
  if (
    typeof first === 'string' &&
    first.includes('SafeAreaView has been deprecated')
  ) {
    return;
  }
  originalWarn(...args);
};
