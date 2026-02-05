import "@testing-library/jest-native/extend-expect";

// Mock AsyncStorage for tests that use it
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
