/**
 * Campus is a shared type representing the two Concordia campuses supported by GitToCampus.
 *
 * Why we use a union type:
 * - Prevents typos (e.g., "Loyala" vs "Loyola") because only valid values compile.
 * - Makes future logic (toggles, API filtering, map presets) type-safe.
 *
 * Usage examples:
 * - selectedCampus state: useState<Campus>('SGW')
 * - choosing camera presets: getCampusRegion(selectedCampus)
 * - requesting data: /buildings?campus=SGW|LOYOLA
 */
export type Campus = 'SGW' | 'LOYOLA';
