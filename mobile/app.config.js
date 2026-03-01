const { expo } = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const baseSchemes = Array.isArray(expo.scheme) ? expo.scheme : expo.scheme ? [expo.scheme] : [];
const scheme = Array.from(new Set([...baseSchemes, expo.android?.package].filter(Boolean)));

if (!googleMapsApiKey) {
  // Keep this as a warning so tests and non-maps flows can still run,
  // while making the native build issue obvious.
  console.warn(
    'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Native Google Maps may fail to initialize.',
  );
}

module.exports = {
  ...expo,
  scheme,
  ios: {
    ...expo.ios,
    config: {
      ...(expo.ios?.config ?? {}),
      googleMapsApiKey,
    },
  },
  android: {
    ...expo.android,
    config: {
      ...(expo.android?.config ?? {}),
      googleMaps: {
        ...(expo.android?.config?.googleMaps ?? {}),
        apiKey: googleMapsApiKey,
      },
    },
  },
};
