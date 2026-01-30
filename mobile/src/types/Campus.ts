/**
 * Campus is a shared type used across the app to represent which campus is currently selected.
 *
 * Why this exists:
 * - Keeps campus values consistent (no typo bugs like "Loyala" vs "Loyola").
 * - Enables future features such as:
 *   - toggling SGW/Loyola
 *   - fetching buildings/polygons by campus
 *   - switching camera presets based on campus
 */