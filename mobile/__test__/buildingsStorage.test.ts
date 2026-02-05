import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ensureDatasetVersion,
  getLastSelectedBuildingId,
  getLastSelectedCampus,
  setLastSelectedBuildingId,
  setLastSelectedCampus,
} from '../src/storage/buildingsStorage';

describe('buildingsStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('ensureDatasetVersion sets version when missing', async () => {
    const setSpy = jest.spyOn(AsyncStorage, 'setItem');

    await ensureDatasetVersion('v1');

    expect(setSpy).toHaveBeenCalledWith('gittocampus.buildings.datasetVersion', 'v1');
  });

  test('ensureDatasetVersion does not set when version matches', async () => {
    const setItemMock = AsyncStorage.setItem as jest.Mock;
    await AsyncStorage.setItem('gittocampus.buildings.datasetVersion', 'v1');
    setItemMock.mockClear();

    await ensureDatasetVersion('v1');

    expect(setItemMock).not.toHaveBeenCalled();
  });

  test('set/get last selected campus returns null for invalid values', async () => {
    await AsyncStorage.setItem('gittocampus.buildings.lastSelectedCampus', 'INVALID');
    const value = await getLastSelectedCampus();
    expect(value).toBeNull();
  });

  test('set/get last selected campus returns SGW or LOYOLA', async () => {
    await setLastSelectedCampus('SGW');
    const sgw = await getLastSelectedCampus();
    expect(sgw).toBe('SGW');

    await setLastSelectedCampus('LOYOLA');
    const loyola = await getLastSelectedCampus();
    expect(loyola).toBe('LOYOLA');
  });

  test('set/get last selected building id', async () => {
    await setLastSelectedBuildingId('abc123');
    const id = await getLastSelectedBuildingId();
    expect(id).toBe('abc123');
  });
});
