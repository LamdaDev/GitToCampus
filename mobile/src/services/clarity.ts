import Constants from 'expo-constants';
import { Platform } from 'react-native';

const SUPPORTED_PLATFORMS = new Set(['android', 'ios']);
let didInitialize = false;

const getClarityProjectId = (): string => (process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID ?? '').trim();

const isExpoGo = (): boolean => Constants.executionEnvironment === 'storeClient';

export const initializeClarityAsync = async (): Promise<void> => {
  if (didInitialize) return;
  if (!SUPPORTED_PLATFORMS.has(Platform.OS)) return;

  const projectId = getClarityProjectId();
  if (!projectId) return;

  if (isExpoGo()) return;

  try {
    const Clarity = require('@microsoft/react-native-clarity') as {
      initialize: (projectId: string) => void;
    };
    Clarity.initialize(projectId);
    didInitialize = true;
  } catch {
    // Clarity is optional in development and unsupported in Expo Go.
  }
};
