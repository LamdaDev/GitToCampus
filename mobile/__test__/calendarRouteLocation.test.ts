import {
  getManualStartReasonMessage,
  resolveCalendarRouteLocation,
} from '../src/utils/calendarRouteLocation';

jest.mock('../src/utils/buildingsRepository', () => ({
  getAllBuildingShapes: jest.fn(),
  findBuildingAt: jest.fn(),
}));

jest.mock('../src/utils/location', () => ({
  getCurrentLocationResult: jest.fn(),
}));

describe('calendarRouteLocation', () => {
  const buildingsRepositoryMock = jest.requireMock('../src/utils/buildingsRepository') as {
    getAllBuildingShapes: jest.Mock;
    findBuildingAt: jest.Mock;
  };
  const locationUtilsMock = jest.requireMock('../src/utils/location') as {
    getCurrentLocationResult: jest.Mock;
  };

  const hallBuilding = {
    id: 'hall',
    campus: 'SGW' as const,
    name: 'Henry F. Hall Building',
    shortCode: 'H',
    address: '1455 De Maisonneuve Blvd W',
    polygons: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    buildingsRepositoryMock.getAllBuildingShapes.mockReturnValue([
      hallBuilding,
      {
        id: 'mb',
        campus: 'SGW' as const,
        name: 'John Molson School of Business',
        shortCode: 'MB',
        address: '1450 Guy St',
        polygons: [],
      },
    ]);
  });

  test('returns error when event location is missing', async () => {
    const result = await resolveCalendarRouteLocation(null);
    expect(result).toEqual({
      type: 'error',
      code: 'MISSING_EVENT_LOCATION',
      message: 'No location found for this event—please update your calendar',
    });
  });

  test('normalizes and resolves SGW H 110 to Hall building', async () => {
    locationUtilsMock.getCurrentLocationResult.mockResolvedValueOnce({
      type: 'success',
      coords: { latitude: 45.5, longitude: -73.57 },
    });
    buildingsRepositoryMock.findBuildingAt.mockReturnValueOnce(hallBuilding);

    const result = await resolveCalendarRouteLocation('SGW H 110');

    expect(result.type).toBe('success');
    if (result.type !== 'success') return;
    expect(result.value.destinationBuilding.id).toBe('hall');
    expect(result.value.normalizedEventLocation).toBe('SGW H 110');
    expect(result.value.startPoint).toEqual({
      type: 'automatic',
      coordinates: { latitude: 45.5, longitude: -73.57 },
      building: hallBuilding,
    });
  });

  test('resolves Hall H-110 via room format normalization', async () => {
    locationUtilsMock.getCurrentLocationResult.mockResolvedValueOnce({
      type: 'permission_denied',
      canAskAgain: true,
    });

    const result = await resolveCalendarRouteLocation('Hall H-110');

    expect(result.type).toBe('success');
    if (result.type !== 'success') return;
    expect(result.value.destinationBuilding.id).toBe('hall');
    expect(result.value.startPoint).toEqual({
      type: 'manual',
      reason: 'permission_denied',
    });
  });

  test('returns unrecognized format error when no building can be matched', async () => {
    const result = await resolveCalendarRouteLocation('Somewhere random floor 8');

    expect(result).toEqual({
      type: 'error',
      code: 'UNRECOGNIZED_EVENT_LOCATION',
      message: 'Could not generate route—try again',
    });
  });

  test('falls back to manual start when user is outside campus polygons', async () => {
    locationUtilsMock.getCurrentLocationResult.mockResolvedValueOnce({
      type: 'success',
      coords: { latitude: 45.123, longitude: -73.999 },
    });
    buildingsRepositoryMock.findBuildingAt.mockReturnValueOnce(undefined);

    const result = await resolveCalendarRouteLocation('H-110');

    expect(result.type).toBe('success');
    if (result.type !== 'success') return;
    expect(result.value.startPoint).toEqual({
      type: 'manual',
      reason: 'outside_campus',
      coordinates: { latitude: 45.123, longitude: -73.999 },
    });
  });

  test('maps manual fallback reasons to user-friendly messages', () => {
    expect(getManualStartReasonMessage('permission_denied')).toBe(
      'Location permission required—please select your starting building manually',
    );
    expect(getManualStartReasonMessage('location_unavailable')).toBe(
      'Could not generate route—try again',
    );
    expect(getManualStartReasonMessage('outside_campus')).toBe(
      'Location permission required—please select your starting building manually',
    );
  });
});
