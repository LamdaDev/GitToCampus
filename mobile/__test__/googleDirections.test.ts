import { buildDirectionsApiUrl, fetchOutdoorDirections } from '../src/services/googleDirections';
import { DirectionsServiceError } from '../src/types/Directions';

describe('googleDirections service', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  test('builds expected request URL', () => {
    const url = buildDirectionsApiUrl(
      {
        origin: { latitude: 45.5, longitude: -73.57 },
        destination: { latitude: 45.49, longitude: -73.58 },
        mode: 'walking',
        units: 'metric',
        language: 'en',
        departureTime: 'now',
      },
      'abc123',
      'walking',
    );

    expect(url).toContain('https://maps.googleapis.com/maps/api/directions/json?');
    expect(url).toContain('origin=45.5%2C-73.57');
    expect(url).toContain('destination=45.49%2C-73.58');
    expect(url).toContain('mode=walking');
    expect(url).toContain('units=metric');
    expect(url).toContain('language=en');
    expect(url).toContain('departure_time=now');
    expect(url).toContain('key=abc123');
  });

  test('returns parsed route data for OK responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            bounds: {
              northeast: { lat: 45.501, lng: -73.56 },
              southwest: { lat: 45.49, lng: -73.59 },
            },
            legs: [
              {
                distance: { text: '1.2 km', value: 1200 },
                duration: { text: '14 mins', value: 840 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(
      {
        origin: { latitude: 45.5, longitude: -73.57 },
        destination: { latitude: 45.49, longitude: -73.58 },
        mode: 'walking',
      },
      'abc123',
    );

    expect(route).toEqual({
      polyline: 'encoded-polyline',
      distanceMeters: 1200,
      distanceText: '1.2 km',
      durationSeconds: 840,
      durationText: '14 mins',
      bounds: {
        northeast: { latitude: 45.501, longitude: -73.56 },
        southwest: { latitude: 45.49, longitude: -73.59 },
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('mode=walking'));
  });

  test('throws when API key is missing', async () => {
    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        '   ',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'MISSING_API_KEY',
    });
  });

  test('maps ZERO_RESULTS to NO_ROUTE', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'ZERO_RESULTS',
      }),
    }) as unknown as typeof fetch;

    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        'abc123',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'NO_ROUTE',
      providerStatus: 'ZERO_RESULTS',
    });
  });

  test('maps REQUEST_DENIED with provider message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'REQUEST_DENIED',
        error_message: 'API key not allowed',
      }),
    }) as unknown as typeof fetch;

    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        'abc123',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'REQUEST_DENIED',
      providerStatus: 'REQUEST_DENIED',
      providerMessage: 'API key not allowed',
    });
  });

  test('throws API_ERROR on non-200 HTTP status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
    }) as unknown as typeof fetch;

    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        'abc123',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'API_ERROR',
      providerMessage: 'Server Error',
    });
  });

  test('throws NETWORK_ERROR when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as unknown as typeof fetch;

    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: 45.5, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        'abc123',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'NETWORK_ERROR',
      providerMessage: 'timeout',
    });
  });
});
