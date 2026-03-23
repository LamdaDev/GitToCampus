# GitToCampus Mobile App

This is an Expo-based React Native app using TypeScript and the managed workflow.

## Prerequisites

- **Node.js** (version 14 or later): Download from [nodejs.org](https://nodejs.org/).
- **npm** or **yarn**: Comes with Node.js.
- **Expo CLI**: Install globally with `npm install -g @expo/cli`.
- **Android Studio** (for Android development):
  - Download from [developer.android.com/studio](https://developer.android.com/studio).
  - During installation, ensure "Android SDK" is selected.
  - After installation, open Android Studio and install SDK components:
    - Go to **File > Settings > Appearance & Behavior > System Settings > Android SDK**.
    - In "SDK Platforms", select at least Android API 33 (or latest).
    - In "SDK Tools", ensure "Android SDK Platform-Tools" is checked.
- **Expo Go App**:
  - For Android: Download from [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
  - For iOS: Download from [App Store](https://apps.apple.com/app/expo-go/id982107779) (requires iOS device).
- **Environment Variables** (for Android):
  - Set `ANDROID_HOME` to `C:\Users\<YourUsername>\AppData\Local\Android\Sdk`.
  - Add `%ANDROID_HOME%\platform-tools` to your PATH.
  - Restart your terminal after setting.

## How to Run

### General Setup

1. Clone or navigate to the project root.
2. Navigate to the `mobile` directory:
   ```bash
   cd mobile
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Add environment variables:
   ```bash
   cp .env.example .env
   ```
   Then set `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `mobile/.env`.
   This key is used for both Directions API requests and native Android/iOS map initialization.
   For Google Calendar sync, also set:
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID`
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID` (used for web or as fallback)
   - `EXPO_PUBLIC_CLARITY_PROJECT_ID` (for Microsoft Clarity session recording)

### Running on Android

1. **Set up Android Emulator**:
   - Open Android Studio.
   - Go to **Tools > Device Manager**.
   - Click "Create device", select a phone (e.g., Pixel 4), and download a system image (e.g., Android 13).
   - Start the emulator from Device Manager.

2. **Start the Expo Server**:

   ```bash
   cd mobile/
   npm start
   ```

   - This opens the Expo dev tools in your browser or shows a QR code in the terminal.

3. **Run on Android Emulator**:
   - In a new terminal (while `npm start` is running), run:
     ```bash
     npm run android
     ```
   - Or, in the Expo dev tools browser, click "Run on Android device/emulator".

4. **Run on Physical Android Device**:
   - Enable USB debugging on your device (Settings > Developer Options > USB Debugging).
   - Connect via USB.
   - Run `npm start`, then `npm run android` or scan QR code with Expo Go.

### Running on iOS

- Requires macOS and Xcode.
- Install Xcode from the Mac App Store.
- Run:
  ```bash
  npm start
  ```
  Then:
  ```bash
  npm run ios
  ```
- Or scan QR code with Expo Go on iOS device.

### Running in Expo Go (Easiest for Testing)

- Run `npm start`.
- On your device (Android or iOS), open Expo Go and scan the QR code.
- Ensure your computer and device are on the same Wi-Fi network.

## Assumptions

- This project uses Expo managed workflow.
- Recommended Node version: 14 or later.
- For Android, Android Studio is required for emulator; physical devices work with USB debugging.
- No custom native modules; stick to Expo SDK.

## Routing Strategy Architecture

The routing services use a Strategy Pattern to keep mode-specific behavior isolated while preserving existing app interfaces.

- `src/services/googleDirections.ts` remains the compatibility facade (`fetchOutdoorDirections`, `buildDirectionsApiUrl`).
- Google mode selection is handled through `DirectionsStrategy` implementations:
  - walk strategy
  - driving strategy
  - transit strategy
- The strategy selector/factory picks a strategy from the requested mode (`walking`, `driving`, `transit`).
- Shared Google API request/parsing logic lives in `src/services/directions/googleDirectionsCore.ts` to avoid duplicate parsing code across strategies.
- Shuttle planning is isolated behind a separate `ShuttlePlanStrategy` layer and continues to preserve cross-campus constraints and existing schedule behavior.

This structure improves extensibility (new modes/route types), testability (strategy-level tests), and maintainability without changing UI behavior.

## Google Calendar OAuth (US-3.1 / TASK-3.1.1)

### Integration approach

- The `SearchSheet` includes a clear `Connect Google Calendar` / `Reconnect Google Calendar` action.
- OAuth is implemented with `expo-auth-session` using Authorization Code + PKCE.
- Google OAuth is not supported in Expo Go for this flow. Use a development build (`npx expo run:android` or `npx expo run:ios`) when testing Google sign-in.
- Google Calendar access is requested with the read-only scope:
  - `https://www.googleapis.com/auth/calendar.readonly`

### Android setup and commands

Use this flow for Android Google Calendar sign-in.

1. Verify app signing fingerprint:

   ```bash
   cd mobile/android
   .\gradlew.bat signingReport
   ```

   Use `app -> Variant: debug -> SHA1` in Google Cloud.

2. Configure Google Cloud OAuth Android client:
   - Application type: `Android`
   - Package name: `com.anonymous.mobile`
   - SHA-1: value from `signingReport`
   - Advanced settings: enable `Custom URI scheme`

3. Set env vars in `mobile/.env`:
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID=<android-client-id>.apps.googleusercontent.com`
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID=<ios-client-id>.apps.googleusercontent.com`
   - `EXPO_PUBLIC_GOOGLE_CALENDAR_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com`

4. Ensure OAuth test users are allowed:
   - Google Auth Platform -> Audience -> add all tester emails.

5. Build and run dev client (not Expo Go):
   ```bash
   cd mobile
   npx expo run:android
   npx expo start --dev-client -c
   ```
   Open the installed dev app (`com.anonymous.mobile`) and connect Google Calendar from the app UI.

### Token storage

- Auth session data (access token metadata + expiry) is stored in `expo-secure-store`.
- Storage key: `gittocampus.googleCalendar.session.v1`.
- No OAuth client IDs or secrets are hardcoded in source; client IDs are read from `EXPO_PUBLIC_*` env vars.

## Microsoft Clarity (Usability Testing)

- SDK package: `@microsoft/react-native-clarity`
- Initialization happens at app startup in `src/App.tsx` via `src/services/clarity.ts`.
- Clarity is skipped in Expo Go by design. Use a development build.

### Commands

1. Install dependencies:
   ```bash
   cd mobile
   npm install
   ```
2. Ensure `EXPO_PUBLIC_CLARITY_PROJECT_ID` is set in `.env`.
3. Build and run dev client:
   - Android:
     ```bash
     npx expo run:android
     npx expo start --dev-client -c
     ```
   - iOS (cloud build):
     ```bash
     npx eas build -p ios --profile development
     npx expo start --dev-client --host tunnel -c
     ```

### Session expiry and reconnect behavior

- On app load, stored session data is validated and expiry-checked.
- Expired or malformed session data is cleared from secure storage.
- UI status is shown as `Connected`, `Not connected`, or `Session expired`.
- If sign-in is canceled/denied/fails, the app remains usable and shows a clear message.
- If a session expires while the app is open, UI switches to `Session expired` and prompts reconnect.

### Google Calendar event location format and filtering (TASK-4.9.1)

Calendar-driven routing assumes physical class locations are entered using a Concordia building reference.

- Preferred format: `<Building Code> <Room>`
  - Examples:
    - `H 810`
    - `H 525`
    - `MB 2.230`
    - `MB S1.110`
- Supported compatibility fallbacks:
  - compact room format: `H810`
  - hyphenated room format: `H-810`
  - campus-prefixed format: `SGW H 810`
  - long-name fallback: `Hall Building 435`, `Henry F. Hall Building 810`

Filtering behavior:

- The app only shows Google Calendar events in `Upcoming Classes` and `Next Class` if the event is active/upcoming and its `location` resolves to a supported Concordia building.
- Events with missing, vague, or unsupported locations such as `Zoom`, `TBD`, or off-campus venues are filtered out of these calendar routing surfaces.
- This filtering is location-based, not title-based. A valid Concordia location is the MVP signal that an event is routable for campus navigation.

## Testing (Jest + React Native Testing Library)

This project uses Jest with `jest-expo` and `@testing-library/react-native`.

### One-Time Setup

1. From the repo root, go to the mobile app:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

Key files already in the repo:

- `mobile/jest.config.js` (Jest config)
- `mobile/jest.setup.ts` (test setup and mocks)
- `mobile/__mocks__/react-native-maps.ts` (MapView/Polygon mock)
- `mobile/__test__/` (test files live here)

### Running Tests

Run all tests:

```bash
cd mobile
npm test
```

Run a single test file:

```bash
cd mobile
npm test -- __test__/geoJson.test.ts
```

Run tests in watch mode:

```bash
cd mobile
npm run test:watch
```

### Writing Tests

Place tests in `mobile/__test__/` using:

- `.test.ts` for non-UI modules
- `.test.tsx` for React components

Example paths:

- `mobile/__test__/geoJson.test.ts`
- `mobile/__test__/MapScreen.test.tsx`

### Mocks Used in This Repo

- AsyncStorage is mocked in `mobile/jest.setup.ts`
- `react-native-maps` is mocked in `mobile/__mocks__/react-native-maps.ts`

If you add a dependency that touches native modules, you may need to add a mock in `mobile/__mocks__/`.

### Common Issues

- If Jest says a test file has no tests, the file exists but has no `test(...)` blocks yet.
- If a mock error appears, make sure the mock file extension matches the syntax used (no JSX in `.ts` files).

## Troubleshooting

- If `adb` is not found, check your PATH and ANDROID_HOME.
- Restart terminal after environment changes.
- If Google sign-in shows `Error 401: deleted_client`:
  - The configured OAuth client ID no longer exists in Google Cloud.
  - Recreate the Android OAuth client for package `com.anonymous.mobile` with your debug SHA-1.
  - Update `EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID` in `mobile/.env`.
  - Rebuild and run again with `npx expo run:android` and `npx expo start --dev-client -c`.
- For Expo issues, check [Expo documentation](https://docs.expo.dev/).
