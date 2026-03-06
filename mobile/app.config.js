const { expo } = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

const toGoogleClientScheme = (clientId) => {
  const normalizedClientId = typeof clientId === 'string' ? clientId.trim() : '';
  if (!normalizedClientId.endsWith(GOOGLE_CLIENT_ID_SUFFIX)) return null;

  const clientIdPrefix = normalizedClientId.slice(0, -GOOGLE_CLIENT_ID_SUFFIX.length).trim();
  if (!clientIdPrefix) return null;

  return `com.googleusercontent.apps.${clientIdPrefix}`;
};

const baseSchemes = [];
if (Array.isArray(expo.scheme)) {
  baseSchemes.push(...expo.scheme);
} else if (expo.scheme) {
  baseSchemes.push(expo.scheme);
}

const googleCalendarSchemes = [
  toGoogleClientScheme(process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID),
  toGoogleClientScheme(process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID),
];

const scheme = Array.from(
  new Set([...baseSchemes, expo.android?.package, ...googleCalendarSchemes].filter(Boolean)),
);

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
