import {
  getIndoorBuildingCampus,
  getIndoorBuildingKeyFromShape,
  normalizeIndoorBuildingKey,
} from '../src/utils/indoor/buildingKeys';

describe('buildingKeys utilities', () => {
  test('normalizes building aliases and ignores punctuation', () => {
    expect(normalizeIndoorBuildingKey('Hall')).toBe('H');
    expect(normalizeIndoorBuildingKey('HB')).toBe('H');
    expect(normalizeIndoorBuildingKey('John Molson')).toBe('MB');
    expect(normalizeIndoorBuildingKey('Vanier Library')).toBe('VL');
    expect(normalizeIndoorBuildingKey('')).toBeNull();
    expect(normalizeIndoorBuildingKey('unknown')).toBeNull();
  });

  test('returns the mapped campus for supported indoor building keys', () => {
    expect(getIndoorBuildingCampus('H')).toBe('SGW');
    expect(getIndoorBuildingCampus('CC')).toBe('LOYOLA');
    expect(getIndoorBuildingCampus(null)).toBeNull();
  });

  test('resolves an indoor building key from short code before falling back to the name', () => {
    expect(
      getIndoorBuildingKeyFromShape({
        shortCode: 'HB',
        name: 'Something Else',
      }),
    ).toBe('H');

    expect(
      getIndoorBuildingKeyFromShape({
        shortCode: undefined,
        name: 'Vanier Library',
      }),
    ).toBe('VL');

    expect(
      getIndoorBuildingKeyFromShape({
        shortCode: undefined,
        name: 'John Molson School of Business',
      }),
    ).toBe('MB');

    expect(
      getIndoorBuildingKeyFromShape({
        shortCode: undefined,
        name: '   ',
      }),
    ).toBeNull();

    expect(getIndoorBuildingKeyFromShape(null)).toBeNull();
  });
});
