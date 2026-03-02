type LoadServiceOptions = {
  platform?: string;
  executionEnvironment?: string;
  projectId?: string | null;
  clarityModuleFactory?: () => unknown;
};

const loadService = ({
  platform = 'ios',
  executionEnvironment = 'standalone',
  projectId = 'clarity-project-id',
  clarityModuleFactory,
}: LoadServiceOptions = {}) => {
  jest.resetModules();
  if (projectId === null) {
    delete process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
  } else {
    process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID = projectId;
  }

  jest.doMock('react-native', () => ({
    Platform: {
      OS: platform,
    },
  }));

  jest.doMock('expo-constants', () => ({
    __esModule: true,
    default: {
      executionEnvironment,
    },
  }));

  const initializeMock = jest.fn();
  if (clarityModuleFactory) {
    jest.doMock('@microsoft/react-native-clarity', clarityModuleFactory);
  } else {
    jest.doMock('@microsoft/react-native-clarity', () => ({
      initialize: initializeMock,
    }));
  }

  const service = require('../src/services/clarity') as {
    initializeClarityAsync: () => Promise<void>;
  };
  return {
    initializeClarityAsync: service.initializeClarityAsync,
    initializeMock,
  };
};

describe('clarity service', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_CLARITY_PROJECT_ID;
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('initializes Clarity once on supported native builds', async () => {
    const { initializeClarityAsync, initializeMock } = loadService();

    await initializeClarityAsync();
    await initializeClarityAsync();

    expect(initializeMock).toHaveBeenCalledTimes(1);
    expect(initializeMock).toHaveBeenCalledWith('clarity-project-id');
  });

  test('does not initialize Clarity when project id is missing', async () => {
    const { initializeClarityAsync, initializeMock } = loadService({
      projectId: '',
    });

    await initializeClarityAsync();

    expect(initializeMock).not.toHaveBeenCalled();
  });

  test('does not initialize Clarity when project id env var is unset', async () => {
    const { initializeClarityAsync, initializeMock } = loadService({
      projectId: null,
    });

    await initializeClarityAsync();

    expect(initializeMock).not.toHaveBeenCalled();
  });

  test('does not initialize Clarity on unsupported platforms', async () => {
    const { initializeClarityAsync, initializeMock } = loadService({
      platform: 'web',
    });

    await initializeClarityAsync();

    expect(initializeMock).not.toHaveBeenCalled();
  });

  test('skips initialization in Expo Go environment', async () => {
    const { initializeClarityAsync, initializeMock } = loadService({
      executionEnvironment: 'storeClient',
    });

    await initializeClarityAsync();

    expect(initializeMock).not.toHaveBeenCalled();
  });

  test('handles module initialization errors gracefully', async () => {
    const { initializeClarityAsync } = loadService({
      clarityModuleFactory: () => {
        throw new Error('native clarity module unavailable');
      },
    });

    await expect(initializeClarityAsync()).resolves.toBeUndefined();
  });
});
