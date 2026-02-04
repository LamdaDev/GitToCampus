import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

export async function getCurrentLocation() {
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();

  if (!granted) {
    if (!canAskAgain) {
      await Linking.openSettings();
    }
    return null;
  }

  return await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}
