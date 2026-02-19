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
- For Expo issues, check [Expo documentation](https://docs.expo.dev/).
