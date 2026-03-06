const { expo } = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const baseSchemes = [];
if (Array.isArray(expo.scheme)) {
  baseSchemes.push(...expo.scheme);
} else if (expo.scheme) {
  baseSchemes.push(expo.scheme);
}
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
  extra: {
    ...expo.extra,
    eas: {
      ...expo.extra?.eas,
      projectId: 'd9559f2e-76d4-44c9-9aaf-65fca4a5a6c8',
    },
  },
  ios: {
    ...expo.ios,
    infoPlist: {
      ...expo.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
    },
    config: {
      ...expo.ios?.config,
      googleMapsApiKey,
    },
  },
  android: {
    ...expo.android,
    config: {
      ...expo.android?.config,
      googleMaps: {
        ...expo.android?.config?.googleMaps,
        apiKey: googleMapsApiKey,
      },
    },
  },
};
