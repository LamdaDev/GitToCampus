import { buildDirectionsApiUrl, fetchOutdoorDirections } from '../src/services/googleDirections';
import { DirectionsServiceError } from '../src/types/Directions';

describe('googleDirections service', () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const baseRequest = {
    origin: { latitude: 45.5, longitude: -73.57 },
    destination: { latitude: 45.49, longitude: -73.58 },
  };

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = originalApiKey;
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

  test('extracts transit instructions with time and stop metadata', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { text: '4.0 km', value: 4000 },
                duration: { text: '26 mins', value: 1560 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: '<b>Walk</b> to <b>Guy-Concordia Station</b>',
                    distance: { text: '300 m', value: 300 },
                    duration: { text: '4 mins', value: 240 },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    duration: { text: '22 mins', value: 1320 },
                    transit_details: {
                      departure_stop: { name: 'Guy-Concordia' },
                      arrival_stop: { name: "De l'Eglise" },
                      departure_time: { text: '3:09 PM', value: 0, time_zone: 'America/Montreal' },
                      arrival_time: { text: '3:31 PM', value: 0, time_zone: 'America/Montreal' },
                      headsign: 'Honore-Beaugrand',
                      num_stops: 20,
                      line: {
                        short_name: '1',
                        color: '#00985F',
                        text_color: '#FFFFFF',
                        vehicle: { type: 'SUBWAY', name: 'Subway' },
                      },
                    },
                  },
                ],
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
        mode: 'transit',
      },
      'abc123',
    );

    expect(route.transitInstructions).toEqual([
      {
        id: 'walk-0-0',
        type: 'walk',
        title: 'Walk to Guy-Concordia Station',
        detail: '300 m, about 4 mins',
      },
      {
        id: 'transit-0-1',
        type: 'transit',
        title: 'Board the 1 metro',
        subtitle: 'Toward Honore-Beaugrand',
        detail: 'Ride 20 stops, 22 mins',
        departureTimeText: '3:09 PM',
        arrivalTimeText: '3:31 PM',
        departureStopName: 'Guy-Concordia',
        arrivalStopName: "De l'Eglise",
        lineShortName: '1',
        lineColor: '#00985F',
        lineTextColor: '#FFFFFF',
        vehicleType: 'SUBWAY',
      },
    ]);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('mode=transit'));
  });

  test('sanitizes walking instruction html with entities, nested tags, and malformed fragments', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { text: '120 m', value: 120 },
                duration: { text: '2 mins', value: 120 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions:
                      'Head&nbsp;<b>north</b> on Main &amp; 1st <div>toward</div> station <broken',
                    distance: { text: '120 m', value: 120 },
                    duration: { text: '2 mins', value: 120 },
                  },
                ],
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(
      {
        ...baseRequest,
        mode: 'transit',
      },
      'abc123',
    );

    expect(route.transitInstructions).toEqual([
      {
        id: 'walk-0-0',
        type: 'walk',
        title: 'Head north on Main & 1st toward station <broken',
        detail: '120 m, about 2 mins',
      },
    ]);
  });

  test('handles transit instruction title/detail fallbacks and skips unsupported steps', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { text: '5.0 km', value: 5000 },
                duration: { text: '32 mins', value: 1920 },
                steps: [
                  {
                    travel_mode: 'TRANSIT',
                    duration: { text: '7 mins', value: 420 },
                    transit_details: {
                      num_stops: 1,
                      headsign: 'Downtown',
                      departure_stop: { name: 'A' },
                      arrival_stop: { name: 'B' },
                      line: {
                        short_name: '24',
                        vehicle: { type: 'BUS', name: 'Bus' },
                      },
                    },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    transit_details: {
                      line: {
                        name: 'Green Line',
                      },
                    },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    transit_details: {
                      line: {
                        vehicle: { type: 'SUBWAY', name: 'Subway' },
                      },
                    },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    duration: { text: '5 mins', value: 300 },
                  },
                  {
                    travel_mode: 'DRIVING',
                    duration: { text: '3 mins', value: 180 },
                  },
                ],
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(
      {
        ...baseRequest,
        mode: 'transit',
      },
      'abc123',
    );

    expect(route.transitInstructions).toEqual([
      {
        id: 'transit-0-0',
        type: 'transit',
        title: 'Board the 24 bus',
        subtitle: 'Toward Downtown',
        detail: 'Ride 1 stop, 7 mins',
        departureTimeText: null,
        arrivalTimeText: null,
        departureStopName: 'A',
        arrivalStopName: 'B',
        lineShortName: '24',
        lineColor: null,
        lineTextColor: null,
        vehicleType: 'BUS',
      },
      {
        id: 'transit-0-1',
        type: 'transit',
        title: 'Board Green Line',
        subtitle: null,
        detail: null,
        departureTimeText: null,
        arrivalTimeText: null,
        departureStopName: null,
        arrivalStopName: null,
        lineShortName: null,
        lineColor: null,
        lineTextColor: null,
        vehicleType: null,
      },
      {
        id: 'transit-0-2',
        type: 'transit',
        title: 'Board metro',
        subtitle: null,
        detail: null,
        departureTimeText: null,
        arrivalTimeText: null,
        departureStopName: null,
        arrivalStopName: null,
        lineShortName: null,
        lineColor: null,
        lineTextColor: null,
        vehicleType: 'SUBWAY',
      },
    ]);
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

  test('builds URL for driving mode without optional fields', () => {
    const url = buildDirectionsApiUrl(baseRequest, 'abc123', 'driving');

    expect(url).toContain('mode=driving');
    expect(url).toContain('units=metric');
    expect(url).not.toContain('language=');
    expect(url).not.toContain('departure_time=');
  });

  test('builds URL for transit mode with imperial units', () => {
    const url = buildDirectionsApiUrl(
      {
        ...baseRequest,
        units: 'imperial',
      },
      'abc123',
      'transit',
    );

    expect(url).toContain('mode=transit');
    expect(url).toContain('units=imperial');
  });

  test('throws INVALID_COORDINATES when coordinates are not finite', async () => {
    await expect(
      fetchOutdoorDirections(
        {
          origin: { latitude: Number.NaN, longitude: -73.57 },
          destination: { latitude: 45.49, longitude: -73.58 },
        },
        'abc123',
      ),
    ).rejects.toMatchObject<Partial<DirectionsServiceError>>({
      code: 'INVALID_COORDINATES',
    });
  });

  test('maps OVER_DAILY_LIMIT to OVER_QUERY_LIMIT', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OVER_DAILY_LIMIT',
      }),
    }) as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code: 'OVER_QUERY_LIMIT',
      providerStatus: 'OVER_DAILY_LIMIT',
    });
  });

  test.each([
    ['NOT_FOUND', 'INVALID_REQUEST'],
    ['OVER_QUERY_LIMIT', 'OVER_QUERY_LIMIT'],
    ['INVALID_REQUEST', 'INVALID_REQUEST'],
    ['MAX_ROUTE_LENGTH_EXCEEDED', 'INVALID_REQUEST'],
  ] as const)('maps %s to %s', async (status, code) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status,
      }),
    }) as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code,
      providerStatus: status,
    });
  });

  test('maps MAX_WAYPOINTS_EXCEEDED to INVALID_REQUEST', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'MAX_WAYPOINTS_EXCEEDED',
      }),
    }) as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code: 'INVALID_REQUEST',
      providerStatus: 'MAX_WAYPOINTS_EXCEEDED',
    });
  });

  test('maps UNKNOWN_ERROR to API_ERROR with fallback message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'UNKNOWN_ERROR',
      }),
    }) as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code: 'API_ERROR',
      providerStatus: 'UNKNOWN_ERROR',
      message: 'Directions request failed.',
    });
  });

  test('throws NO_ROUTE when route payload has no polyline points', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            legs: [
              {
                distance: { value: 1200 },
                duration: { value: 840 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code: 'NO_ROUTE',
    });
  });

  test('uses fallback formatter values when legs do not include text', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { value: 500 },
                duration: { value: 30 },
              },
              {
                distance: { value: 600 },
                duration: { value: 3600 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(baseRequest, 'abc123');

    expect(route.distanceMeters).toBe(1100);
    expect(route.durationSeconds).toBe(3630);
    expect(route.distanceText).toBe('1.1 km');
    expect(route.durationText).toBe('1 hr 1 min');
    expect(route.bounds).toBeNull();
  });

  test('uses imperial fallback formatting and forwards driving mode query', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { value: 1609.344 },
                duration: { value: 3600 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(
      {
        ...baseRequest,
        mode: 'driving',
        units: 'imperial',
      },
      'abc123',
    );

    expect(route.distanceText).toBe('1.0 mi');
    expect(route.durationText).toBe('1 hr');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('mode=driving'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('units=imperial'));
  });

  test('uses default walking mode when URL builder mode parameter is omitted', () => {
    const url = buildDirectionsApiUrl(baseRequest, 'abc123');
    expect(url).toContain('mode=walking');
  });

  test('uses env API key when apiKey argument is omitted', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'env-key-123';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { text: '1 km', value: 1000 },
                duration: { text: '10 mins', value: 600 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    await fetchOutdoorDirections(baseRequest);

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('key=env-key-123'));
  });

  test('uses unknown network message when rejection is not an Error instance', async () => {
    global.fetch = jest.fn().mockRejectedValue('socket fail') as unknown as typeof fetch;

    await expect(fetchOutdoorDirections(baseRequest, 'abc123')).rejects.toMatchObject<
      Partial<DirectionsServiceError>
    >({
      code: 'NETWORK_ERROR',
      providerMessage: 'Unknown network error',
    });
  });

  test('uses short metric and minute fallback formatting paths', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
            legs: [
              {
                distance: { value: 750 },
                duration: { value: 120 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(baseRequest, 'abc123');

    expect(route.distanceText).toBe('750 m');
    expect(route.durationText).toBe('2 min');
  });

  test('handles route with empty legs by producing zero totals', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'encoded-polyline' },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await fetchOutdoorDirections(baseRequest, 'abc123');

    expect(route.distanceMeters).toBe(0);
    expect(route.durationSeconds).toBe(0);
    expect(route.distanceText).toBe('0 m');
    expect(route.durationText).toBe('0 sec');
  });
});
