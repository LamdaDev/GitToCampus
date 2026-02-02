import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Campus } from "../types/Campus";

const KEY_DATASET_VERSION = "gittocampus.buildings.datasetVersion";
const KEY_LAST_SELECTED_CAMPUS = "gittocampus.buildings.lastSelectedCampus";
const KEY_LAST_SELECTED_BUILDING = "gittocampus.buildings.lastSelectedBuildingId";

/**
 * Store a dataset version flag so we can detect changes later.
 * Keep it simple: "v1" for now.
 */
export const ensureDatasetVersion = async (version: string): Promise<void> => {
  const current = await AsyncStorage.getItem(KEY_DATASET_VERSION);
  if (current !== version) {
    await AsyncStorage.setItem(KEY_DATASET_VERSION, version);
  }
};

export const setLastSelectedCampus = async (campus: Campus): Promise<void> => {
  await AsyncStorage.setItem(KEY_LAST_SELECTED_CAMPUS, campus);
};

export const getLastSelectedCampus = async (): Promise<Campus | null> => {
  const value = await AsyncStorage.getItem(KEY_LAST_SELECTED_CAMPUS);
  if (value === "SGW" || value === "LOYOLA") return value;
  return null;
};

export const setLastSelectedBuildingId = async (id: string): Promise<void> => {
  await AsyncStorage.setItem(KEY_LAST_SELECTED_BUILDING, id);
};

export const getLastSelectedBuildingId = async (): Promise<string | null> => {
  return AsyncStorage.getItem(KEY_LAST_SELECTED_BUILDING);
};
