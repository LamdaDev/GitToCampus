import { getIndoorTransferPoint } from '../src/utils/indoor/indoorTransferPoints';

describe('getIndoorTransferPoint', () => {
  test('returns the configured transfer point for a supported building', () => {
    expect(getIndoorTransferPoint('H')).toEqual({
      buildingKey: 'H',
      campus: 'SGW',
      accessNodeId: 'H1_F1_building_entry_exit_7',
      outdoorCoords: { latitude: 45.497092, longitude: -73.5788 },
      accessible: true,
    });
  });

  test('returns null when the building key is missing or unsupported', () => {
    expect(getIndoorTransferPoint(null)).toBeNull();
    expect(getIndoorTransferPoint('EV' as never)).toBeNull();
  });
});
