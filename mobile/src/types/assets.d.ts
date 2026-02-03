// Fixes TypeScript so your editor/TS compiler accepts .geojson imports.
declare module '*.geojson' {
  const value: any;
  export default value;
}
