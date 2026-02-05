import "@testing-library/jest-native/extend-expect";

// Mock AsyncStorage for tests that use it
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

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
