import type { OutdoorPoi } from '../src/types/Poi';

const MOCK_REGIONS = {
  SGW: { latitude: 45.4973, longitude: -73.5789, latitudeDelta: 0.01, longitudeDelta: 0.01 },
  LOYOLA: { latitude: 45.4582, longitude: -73.6405, latitudeDelta: 0.012, longitudeDelta: 0.012 },
};

const samplePois: OutdoorPoi[] = [
  {
    id: 'cafe-sgw-01',
    name: 'SGW Cafe Near',
    category: 'cafe',
    campus: 'SGW',
    latitude: 45.4975,
    longitude: -73.579,
    address: '1 Test St',
  },
  {
    id: 'cafe-sgw-08',
    name: 'SGW Cafe Far',
    category: 'cafe',
    campus: 'SGW',
    latitude: 45.52,
    longitude: -73.6,
    address: '2 Test St',
  },
  {
    id: 'restaurant-sgw-01',
    name: 'SGW Restaurant Near',
    category: 'restaurant',
    campus: 'SGW',
    latitude: 45.4977,
    longitude: -73.5791,
    address: '3 Test St',
  },
  {
    id: 'cafe-loy-01',
    name: 'LOY Cafe Near',
    category: 'cafe',
    campus: 'LOYOLA',
    latitude: 45.4584,
    longitude: -73.6407,
    address: '4 Test St',
  },
];

type NearbyPoiEntry = { poi: OutdoorPoi; distance: number };

const loadRepository = (pois: OutdoorPoi[] = samplePois) => {
  jest.resetModules();

  const getDistanceMock = jest.fn();
  const getCampusRegionMock = jest.fn((campus: 'SGW' | 'LOYOLA') =>
    campus === 'SGW' ? MOCK_REGIONS.SGW : MOCK_REGIONS.LOYOLA,
  );

  jest.doMock('../src/constants/outdoorPois', () => ({
    OUTDOOR_POIS: pois,
  }));
  jest.doMock('geolib', () => ({
    getDistance: getDistanceMock,
  }));
  jest.doMock('../src/constants/campuses', () => ({
    ...jest.requireActual('../src/constants/campuses'),
    getCampusRegion: getCampusRegionMock,
  }));

  const repo = require('../src/utils/outdoorPoisRepository');
  return { repo, mocks: { getDistanceMock, getCampusRegionMock } };
};

describe('outdoorPoisRepository', () => {
  test('returns all outdoor POIs', () => {
    const { repo } = loadRepository();

    expect(repo.getAllOutdoorPois()).toHaveLength(4);
  });

  test('filters POIs by campus', () => {
    const { repo } = loadRepository();

    expect(repo.getCampusOutdoorPois('SGW')).toHaveLength(3);
    expect(repo.getCampusOutdoorPois('LOYOLA')).toHaveLength(1);
  });

  test('filters POIs by campus and category', () => {
    const { repo } = loadRepository();

    expect(repo.getCampusOutdoorPoisByCategory('SGW', 'cafe')).toHaveLength(2);
    expect(repo.getCampusOutdoorPoisByCategory('SGW', 'restaurant')).toHaveLength(1);
    expect(repo.getCampusOutdoorPoisByCategory('LOYOLA', 'restaurant')).toHaveLength(0);
  });

  test('findNearbyOutdoorPois filters by curated range bucket, sorts by distance, and respects limit', () => {
    const { repo, mocks } = loadRepository();

    mocks.getDistanceMock.mockReturnValueOnce(120).mockReturnValueOnce(4500);

    const results = repo.findNearbyOutdoorPois('SGW', 'cafe', 1, 30);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      poi: samplePois[0],
      distance: 120,
    });
    expect(mocks.getCampusRegionMock).toHaveBeenCalledWith('SGW');
  });

  test('findNearbyOutdoorPois sorts ascending by distance and limits results', () => {
    const duplicateCafeSet: OutdoorPoi[] = [
      samplePois[0],
      {
        ...samplePois[0],
        id: 'cafe-sgw-02',
        name: 'SGW Cafe Closer',
      },
    ];
    const { repo, mocks } = loadRepository(duplicateCafeSet);

    mocks.getDistanceMock.mockReturnValueOnce(240).mockReturnValueOnce(90);

    const results = repo.findNearbyOutdoorPois('SGW', 'cafe', 1, 1);

    expect(results).toHaveLength(1);
    expect(results[0].distance).toBe(90);
    expect(results[0].poi.id).toBe('cafe-sgw-02');
  });

  test('findNearbyOutdoorPois includes Loyola cafes through the selected curated range bucket', () => {
    const loyolaCafeSet: OutdoorPoi[] = [
      {
        id: 'cafe-loy-02',
        name: 'LOY 1km Cafe',
        category: 'cafe',
        campus: 'LOYOLA',
        latitude: 45.4582,
        longitude: -73.6405,
        address: '5 Test St',
      },
      {
        id: 'cafe-loy-06',
        name: 'LOY 2km Cafe',
        category: 'cafe',
        campus: 'LOYOLA',
        latitude: 45.4592,
        longitude: -73.6415,
        address: '6 Test St',
      },
      {
        id: 'cafe-loy-09',
        name: 'LOY 3km Cafe',
        category: 'cafe',
        campus: 'LOYOLA',
        latitude: 45.4602,
        longitude: -73.6425,
        address: '7 Test St',
      },
    ];
    const { repo, mocks } = loadRepository(loyolaCafeSet);

    mocks.getDistanceMock
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(300);

    expect(
      repo
        .findNearbyOutdoorPois('LOYOLA', 'cafe', 2, 10)
        .map((entry: NearbyPoiEntry) => entry.poi.id),
    ).toEqual(['cafe-loy-02', 'cafe-loy-06']);
  });

  test('findNearbyOutdoorPois includes Loyola restaurants through the selected curated range bucket', () => {
    const loyolaRestaurantSet: OutdoorPoi[] = [
      {
        id: 'restaurant-loy-04',
        name: 'LOY 1km Restaurant',
        category: 'restaurant',
        campus: 'LOYOLA',
        latitude: 45.4582,
        longitude: -73.6405,
        address: '8 Test St',
      },
      {
        id: 'restaurant-loy-10',
        name: 'LOY 2km Restaurant',
        category: 'restaurant',
        campus: 'LOYOLA',
        latitude: 45.4592,
        longitude: -73.6415,
        address: '9 Test St',
      },
      {
        id: 'restaurant-loy-12',
        name: 'LOY 3km Restaurant',
        category: 'restaurant',
        campus: 'LOYOLA',
        latitude: 45.4602,
        longitude: -73.6425,
        address: '10 Test St',
      },
    ];
    const { repo, mocks } = loadRepository(loyolaRestaurantSet);

    mocks.getDistanceMock
      .mockReturnValueOnce(110)
      .mockReturnValueOnce(220)
      .mockReturnValueOnce(330);

    expect(
      repo
        .findNearbyOutdoorPois('LOYOLA', 'restaurant', 2, 10)
        .map((entry: NearbyPoiEntry) => entry.poi.id),
    ).toEqual(['restaurant-loy-04', 'restaurant-loy-10']);
  });

  test('findNearbyOutdoorPois places invalid sequence ids in the furthest curated bucket', () => {
    const invalidSequenceSet: OutdoorPoi[] = [
      {
        id: 'cafe-sgw-invalid',
        name: 'SGW Unknown Bucket',
        category: 'cafe',
        campus: 'SGW',
        latitude: 45.4975,
        longitude: -73.579,
        address: '11 Test St',
      },
    ];
    const { repo, mocks } = loadRepository(invalidSequenceSet);

    mocks.getDistanceMock.mockReturnValueOnce(140);

    expect(repo.findNearbyOutdoorPois('SGW', 'cafe', 2, 10)).toEqual([]);
    expect(repo.findNearbyOutdoorPois('SGW', 'cafe', 3, 10)).toHaveLength(1);
  });

  test('findNearbyOutdoorPois uses default range and limit when omitted', () => {
    const defaultArgumentSet: OutdoorPoi[] = [
      {
        id: 'cafe-sgw-01',
        name: 'SGW 1km Cafe',
        category: 'cafe',
        campus: 'SGW',
        latitude: 45.4975,
        longitude: -73.579,
        address: '12 Test St',
      },
      {
        id: 'cafe-sgw-15',
        name: 'SGW 3km Cafe',
        category: 'cafe',
        campus: 'SGW',
        latitude: 45.4985,
        longitude: -73.58,
        address: '13 Test St',
      },
    ];
    const { repo, mocks } = loadRepository(defaultArgumentSet);

    mocks.getDistanceMock.mockReturnValueOnce(100).mockReturnValueOnce(300);

    expect(repo.findNearbyOutdoorPois('SGW', 'cafe')).toHaveLength(2);
  });
});
