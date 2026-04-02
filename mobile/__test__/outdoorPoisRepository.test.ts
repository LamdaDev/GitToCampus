const MOCK_REGIONS = {
  SGW: { latitude: 45.4973, longitude: -73.5789, latitudeDelta: 0.01, longitudeDelta: 0.01 },
  LOYOLA: { latitude: 45.4582, longitude: -73.6405, latitudeDelta: 0.012, longitudeDelta: 0.012 },
};

const samplePois = [
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

const loadRepository = () => {
  jest.resetModules();

  const getDistanceMock = jest.fn();
  const getCampusRegionMock = jest.fn((campus: 'SGW' | 'LOYOLA') =>
    campus === 'SGW' ? MOCK_REGIONS.SGW : MOCK_REGIONS.LOYOLA,
  );

  jest.doMock('../src/constants/outdoorPois', () => ({
    OUTDOOR_POIS: samplePois,
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

    mocks.getDistanceMock
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(4500);

    const results = repo.findNearbyOutdoorPois('SGW', 'cafe', 1, 30);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      poi: samplePois[0],
      distance: 120,
    });
    expect(mocks.getCampusRegionMock).toHaveBeenCalledWith('SGW');
  });

  test('findNearbyOutdoorPois sorts ascending by distance and limits results', () => {
    const { repo, mocks } = loadRepository();

    mocks.getDistanceMock.mockReturnValueOnce(240).mockReturnValueOnce(90);

    const duplicateCafeSet = [
      samplePois[0],
      {
        ...samplePois[0],
        id: 'cafe-sgw-02',
        name: 'SGW Cafe Closer',
      },
    ];

    jest.resetModules();
    jest.doMock('../src/constants/outdoorPois', () => ({
      OUTDOOR_POIS: duplicateCafeSet,
    }));
    jest.doMock('geolib', () => ({
      getDistance: mocks.getDistanceMock,
    }));
    jest.doMock('../src/constants/campuses', () => ({
      ...jest.requireActual('../src/constants/campuses'),
      getCampusRegion: mocks.getCampusRegionMock,
    }));

    const repoReloaded = require('../src/utils/outdoorPoisRepository');
    const results = repoReloaded.findNearbyOutdoorPois('SGW', 'cafe', 1, 1);

    expect(results).toHaveLength(1);
    expect(results[0].distance).toBe(90);
    expect(results[0].poi.id).toBe('cafe-sgw-02');
  });
});
