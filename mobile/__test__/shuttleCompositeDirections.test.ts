import { DirectionsServiceError } from '../src/types/Directions';
import { fetchShuttleCompositeDirections } from '../src/services/directions/shuttleCompositeDirections';
import { encodePolyline } from '../src/utils/polyline';

describe('shuttleCompositeDirections service', () => {
  test('builds a composite shuttle route with ordered walking and shuttle segments', async () => {
    const preWalkPolyline = encodePolyline([
      { latitude: 45.4585, longitude: -73.6406 },
      { latitude: 45.458317, longitude: -73.640225 },
    ]);
    const shuttlePolyline = encodePolyline([
      { latitude: 45.458317, longitude: -73.640225 },
      { latitude: 45.48, longitude: -73.61 },
      { latitude: 45.497193, longitude: -73.578985 },
    ]);
    const postWalkPolyline = encodePolyline([
      { latitude: 45.497193, longitude: -73.578985 },
      { latitude: 45.495376, longitude: -73.577997 },
    ]);

    const fetchDirections = jest.fn(async (request) => {
      if (
        request.mode === 'walking' &&
        request.destination.latitude === 45.458317 &&
        request.destination.longitude === -73.640225
      ) {
        return {
          polyline: preWalkPolyline,
          distanceMeters: 450,
          distanceText: '450 m',
          durationSeconds: 360,
          durationText: '6 mins',
          bounds: null,
        };
      }

      if (
        request.mode === 'driving' &&
        request.origin.latitude === 45.458317 &&
        request.destination.latitude === 45.497193
      ) {
        return {
          polyline: shuttlePolyline,
          distanceMeters: 8200,
          distanceText: '8.2 km',
          durationSeconds: 1200,
          durationText: '20 mins',
          bounds: null,
        };
      }

      return {
        polyline: postWalkPolyline,
        distanceMeters: 300,
        distanceText: '300 m',
        durationSeconds: 240,
        durationText: '4 mins',
        bounds: null,
      };
    });

    const route = await fetchShuttleCompositeDirections(
      {
        direction: 'LOYOLA_TO_SGW',
        pickup: {
          id: 'loy-ad',
          campus: 'LOYOLA',
          name: 'Loyola Shuttle Stop (AD Building)',
          coords: { latitude: 45.458317, longitude: -73.640225 },
        },
        dropoff: {
          id: 'sgw-hall',
          campus: 'SGW',
          name: 'SGW Shuttle Stop (Hall Building)',
          coords: { latitude: 45.497193, longitude: -73.578985 },
        },
        preShuttleWalk: {
          kind: 'pre_shuttle_walk',
          mode: 'walking',
          origin: { latitude: 45.4585, longitude: -73.6406 },
          destination: { latitude: 45.458317, longitude: -73.640225 },
        },
        shuttleRide: {
          kind: 'shuttle_ride',
          mode: 'shuttle',
          origin: { latitude: 45.458317, longitude: -73.640225 },
          destination: { latitude: 45.497193, longitude: -73.578985 },
        },
        postShuttleWalk: {
          kind: 'post_shuttle_walk',
          mode: 'walking',
          origin: { latitude: 45.497193, longitude: -73.578985 },
          destination: { latitude: 45.495376, longitude: -73.577997 },
        },
        nextDepartures: ['10:15 AM'],
        nextDepartureDates: [],
        nextDepartureInMinutes: 2,
        isServiceAvailable: true,
      },
      { fetchDirections },
    );

    expect(fetchDirections).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        mode: 'walking',
        origin: { latitude: 45.4585, longitude: -73.6406 },
        destination: { latitude: 45.458317, longitude: -73.640225 },
      }),
    );
    expect(fetchDirections).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        mode: 'driving',
        origin: { latitude: 45.458317, longitude: -73.640225 },
        destination: { latitude: 45.497193, longitude: -73.578985 },
      }),
    );
    expect(fetchDirections).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        mode: 'walking',
        origin: { latitude: 45.497193, longitude: -73.578985 },
        destination: { latitude: 45.495376, longitude: -73.577997 },
      }),
    );
    expect(route.distanceMeters).toBe(8950);
    expect(route.durationSeconds).toBe(1800);
    expect(route.routeSegments).toEqual([
      { polyline: preWalkPolyline, mode: 'walking' },
      { polyline: shuttlePolyline, mode: 'shuttle' },
      { polyline: postWalkPolyline, mode: 'walking' },
    ]);
  });

  test('throws when shuttle plan is missing composite route legs', async () => {
    await expect(
      fetchShuttleCompositeDirections({
        direction: 'LOYOLA_TO_SGW',
        pickup: null,
        dropoff: null,
        nextDepartures: [],
        nextDepartureDates: [],
        nextDepartureInMinutes: null,
        isServiceAvailable: false,
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DirectionsServiceError>>({
        code: 'INVALID_REQUEST',
      }),
    );
  });
});
