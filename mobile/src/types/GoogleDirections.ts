export type GoogleDirectionsStatus =
  | 'OK'
  | 'NOT_FOUND'
  | 'ZERO_RESULTS'
  | 'MAX_WAYPOINTS_EXCEEDED'
  | 'MAX_ROUTE_LENGTH_EXCEEDED'
  | 'INVALID_REQUEST'
  | 'OVER_DAILY_LIMIT'
  | 'OVER_QUERY_LIMIT'
  | 'REQUEST_DENIED'
  | 'UNKNOWN_ERROR';

export type GoogleDirectionsLeg = {
  distance?: { text?: string; value?: number };
  duration?: { text?: string; value?: number };
};

export type GoogleDirectionsRoute = {
  overview_polyline?: { points?: string };
  bounds?: {
    northeast?: { lat: number; lng: number };
    southwest?: { lat: number; lng: number };
  };
  legs?: GoogleDirectionsLeg[];
};

export type GoogleDirectionsResponse = {
  status: GoogleDirectionsStatus;
  error_message?: string;
  routes?: GoogleDirectionsRoute[];
};
