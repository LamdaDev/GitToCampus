const loadAppConfig = () => {
  jest.resetModules();
  return require('../app.config.js');
};

describe('app.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-maps-key';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('includes google oauth callback schemes and iOS image host ATS exceptions', () => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID =
      '84039552841-5f103afd16hji1k39pt9i2tghnsumr9q.apps.googleusercontent.com';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID =
      '84039552841-dgrb0fg4kcmoaep3pqlbc11smb4v7v0b.apps.googleusercontent.com';

    const config = loadAppConfig();

    expect(config.scheme).toEqual(
      expect.arrayContaining([
        'gittocampus',
        'com.anonymous.mobile',
        'com.googleusercontent.apps.84039552841-5f103afd16hji1k39pt9i2tghnsumr9q',
        'com.googleusercontent.apps.84039552841-dgrb0fg4kcmoaep3pqlbc11smb4v7v0b',
      ]),
    );

    const ats = config.ios.infoPlist.NSAppTransportSecurity;
    expect(ats).toMatchObject({
      NSAllowsArbitraryLoads: false,
      NSAllowsLocalNetworking: true,
    });
    expect(ats.NSExceptionDomains['iili.io']).toMatchObject({
      NSIncludesSubdomains: true,
      NSExceptionAllowsInsecureHTTPLoads: true,
    });
    expect(ats.NSExceptionDomains['postimg.cc']).toMatchObject({
      NSIncludesSubdomains: true,
      NSExceptionRequiresForwardSecrecy: false,
    });
    expect(ats.NSExceptionDomains['i.postimg.cc']).toMatchObject({
      NSIncludesSubdomains: true,
      NSExceptionMinimumTLSVersion: 'TLSv1.0',
    });
  });

  test('ignores malformed google oauth client ids when building schemes', () => {
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID = 'invalid-ios-client-id';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID = '';

    const config = loadAppConfig();

    expect(
      config.scheme.some(
        (scheme: string) =>
          scheme.startsWith('com.googleusercontent.apps.') &&
          scheme !== 'com.googleusercontent.apps.',
      ),
    ).toBe(false);
  });

  test('handles array schemes and warns when maps key is missing', () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = '';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_IOS_CLIENT_ID = '';
    process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_ANDROID_CLIENT_ID = '';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    jest.resetModules();
    jest.doMock('../app.json', () => ({
      expo: {
        name: 'mobile',
        slug: 'mobile',
        scheme: ['gittocampus', 'gittocampus-alt'],
        ios: {
          infoPlist: {},
        },
        android: {
          package: 'com.anonymous.mobile',
          config: {
            googleMaps: {},
          },
        },
      },
    }));

    const config = require('../app.config.js');

    expect(config.scheme).toEqual(
      expect.arrayContaining(['gittocampus', 'gittocampus-alt', 'com.anonymous.mobile']),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is not set. Native Google Maps may fail to initialize.',
    );

    warnSpy.mockRestore();
    jest.dontMock('../app.json');
  });
});
