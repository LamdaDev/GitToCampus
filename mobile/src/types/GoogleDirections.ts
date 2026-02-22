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
  steps?: GoogleDirectionsStep[];
};

export type GoogleTransitDetails = {
  departure_stop?: { name?: string };
  arrival_stop?: { name?: string };
  departure_time?: { text?: string; value?: number; time_zone?: string };
  arrival_time?: { text?: string; value?: number; time_zone?: string };
  headsign?: string;
  num_stops?: number;
  line?: {
    name?: string;
    short_name?: string;
    color?: string;
    text_color?: string;
    vehicle?: { type?: string; name?: string };
  };
};

export type GoogleDirectionsStep = {
  travel_mode?: 'WALKING' | 'DRIVING' | 'TRANSIT' | 'BICYCLING';
  html_instructions?: string;
  distance?: { text?: string; value?: number };
  duration?: { text?: string; value?: number };
  transit_details?: GoogleTransitDetails;
  steps?: GoogleDirectionsStep[];
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
