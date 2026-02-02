/**
 * Minimal GeoJSON type definitions used by GitToCampus.
 * We only define the subset required for campus outlines, building metadata (Point),
 * and building boundaries (Polygon / MultiPolygon).
 */

export type GeoJsonPosition = [number, number]; // [longitude, latitude]

export type GeoJsonPoint = {
  type: "Point";
  coordinates: GeoJsonPosition;
};

export type GeoJsonPolygon = {
  type: "Polygon";
  coordinates: GeoJsonPosition[][]; // [ring][pos]
};

export type GeoJsonMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoJsonPosition[][][]; // [polygon][ring][pos]
};

export type GeoJsonGeometry = GeoJsonPoint | GeoJsonPolygon | GeoJsonMultiPolygon;

export type GeoJsonFeature<TProps = Record<string, unknown>> = {
  type: "Feature";
  geometry: GeoJsonGeometry | null;
  properties: TProps;
};

export type GeoJsonFeatureCollection<TProps = Record<string, unknown>> = {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature<TProps>>;
};
