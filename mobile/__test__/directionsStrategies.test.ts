import { drivingDirectionsStrategy } from '../src/services/directions/strategies/drivingDirectionsStrategy';
import { transitDirectionsStrategy } from '../src/services/directions/strategies/transitDirectionsStrategy';
import { walkDirectionsStrategy } from '../src/services/directions/strategies/walkDirectionsStrategy';

describe('directions strategies', () => {
  const baseRequest = {
    origin: { latitude: 45.5, longitude: -73.57 },
    destination: { latitude: 45.49, longitude: -73.58 },
  };

  test('walk strategy requests walking mode and returns base route shape', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'walk-polyline' },
            legs: [
              {
                distance: { text: '1.0 km', value: 1000 },
                duration: { text: '12 mins', value: 720 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await walkDirectionsStrategy.fetchRoute(baseRequest, {
      apiKey: 'abc123',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('mode=walking'));
    expect(route).toMatchObject({
      polyline: 'walk-polyline',
      distanceMeters: 1000,
      durationSeconds: 720,
    });
    expect(route).not.toHaveProperty('transitInstructions');
  });

  test('driving strategy requests driving mode and returns base route shape', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'drive-polyline' },
            legs: [
              {
                distance: { text: '2.1 km', value: 2100 },
                duration: { text: '8 mins', value: 480 },
              },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const route = await drivingDirectionsStrategy.fetchRoute(baseRequest, {
      apiKey: 'abc123',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('mode=driving'));
    expect(route).toMatchObject({
      polyline: 'drive-polyline',
      distanceMeters: 2100,
      durationSeconds: 480,
    });
    expect(route).not.toHaveProperty('transitInstructions');
  });

  test('transit strategy requests transit mode and includes transit instructions', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        routes: [
          {
            overview_polyline: { points: 'transit-polyline' },
            legs: [
              {
                distance: { text: '4.0 km', value: 4000 },
                duration: { text: '25 mins', value: 1500 },
                steps: [
                  {
                    travel_mode: 'WALKING',
                    html_instructions: '<b>Walk</b> to stop',
                    distance: { text: '200 m', value: 200 },
                    duration: { text: '3 mins', value: 180 },
                  },
                  {
                    travel_mode: 'TRANSIT',
                    duration: { text: '22 mins', value: 1320 },
                    transit_details: {
                      line: {
                        short_name: '24',
                        vehicle: { type: 'BUS', name: 'Bus' },
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

    const route = await transitDirectionsStrategy.fetchRoute(baseRequest, {
      apiKey: 'abc123',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('mode=transit'));
    expect(route.transitInstructions).toEqual([
      {
        id: 'walk-0-0',
        type: 'walk',
        title: 'Walk to stop',
        detail: '200 m, about 3 mins',
      },
      {
        id: 'transit-0-1',
        type: 'transit',
        title: 'Board the 24 bus',
        subtitle: null,
        detail: '22 mins',
        departureTimeText: null,
        arrivalTimeText: null,
        departureStopName: null,
        arrivalStopName: null,
        lineShortName: '24',
        lineColor: null,
        lineTextColor: null,
        vehicleType: 'BUS',
      },
    ]);
  });
});
