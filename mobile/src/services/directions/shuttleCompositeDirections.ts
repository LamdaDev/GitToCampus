import type {
  DirectionsBounds,
  DirectionsRequest,
  DirectionsRoute,
  DirectionsRouteSegment,
  DirectionsTravelMode,
  DirectionsUnits,
} from '../../types/Directions';
import { DirectionsServiceError } from '../../types/Directions';
import type { ShuttlePlan, ShuttlePlanLeg } from '../../types/Shuttle';
import { formatDistance, formatDuration } from '../../utils/directionsFormatting';
import { decodePolyline, encodePolyline } from '../../utils/polyline';
import { fetchOutdoorDirections } from '../googleDirections';

type FetchDirectionsFn = (request: DirectionsRequest) => Promise<DirectionsRoute>;

type ShuttleDirectionsOptions = {
  units?: DirectionsUnits;
  language?: string;
  fetchDirections?: FetchDirectionsFn;
};

const DEFAULT_UNITS: DirectionsUnits = 'metric';
const COORDINATE_EPSILON = 1e-7;

const areSameCoordinates = (
  origin: NonNullable<ShuttlePlanLeg['origin']>,
  destination: NonNullable<ShuttlePlanLeg['destination']>,
) =>
  Math.abs(origin.latitude - destination.latitude) <= COORDINATE_EPSILON &&
  Math.abs(origin.longitude - destination.longitude) <= COORDINATE_EPSILON;

const buildZeroLengthRoute = (units: DirectionsUnits): DirectionsRoute => ({
  polyline: '',
  distanceMeters: 0,
  distanceText: formatDistance(0, units),
  durationSeconds: 0,
  durationText: formatDuration(0),
  bounds: null,
  routeSegments: [],
});

const getRouteModeForLeg = (leg: ShuttlePlanLeg): DirectionsTravelMode =>
  leg.mode === 'shuttle' ? 'driving' : 'walking';

const getSegmentModeForLeg = (leg: ShuttlePlanLeg): DirectionsRouteSegment['mode'] =>
  leg.mode === 'shuttle' ? 'shuttle' : 'walking';

const fetchRouteForLeg = async (
  leg: ShuttlePlanLeg,
  {
    units,
    language,
    fetchDirections,
  }: Required<Pick<ShuttleDirectionsOptions, 'units' | 'fetchDirections'>> &
    Pick<ShuttleDirectionsOptions, 'language'>,
) => {
  const origin = leg.origin;
  const destination = leg.destination;

  if (!origin || !destination) {
    throw new DirectionsServiceError(
      'INVALID_REQUEST',
      `Shuttle plan leg ${leg.kind} is missing origin or destination coordinates.`,
    );
  }

  if (areSameCoordinates(origin, destination)) {
    return buildZeroLengthRoute(units);
  }

  return fetchDirections({
    origin,
    destination,
    mode: getRouteModeForLeg(leg),
    units,
    language,
  });
};

const toRouteSegments = (route: DirectionsRoute, leg: ShuttlePlanLeg): DirectionsRouteSegment[] => {
  const normalizedPolyline = route.polyline.trim();
  if (!normalizedPolyline) return [];

  if (route.routeSegments && route.routeSegments.length > 0) {
    return route.routeSegments.map((segment) => ({
      ...segment,
      mode: leg.mode === 'shuttle' ? 'shuttle' : segment.mode,
    }));
  }

  return [{ polyline: normalizedPolyline, mode: getSegmentModeForLeg(leg) }];
};

const appendCoordinates = (
  target: ReturnType<typeof decodePolyline>,
  nextCoordinates: ReturnType<typeof decodePolyline>,
) => {
  if (!nextCoordinates.length) return;
  if (!target.length) {
    target.push(...nextCoordinates);
    return;
  }

  const lastCoordinate = target[target.length - 1];
  const firstNextCoordinate = nextCoordinates[0];
  const shouldSkipFirstCoordinate =
    Math.abs(lastCoordinate.latitude - firstNextCoordinate.latitude) <= COORDINATE_EPSILON &&
    Math.abs(lastCoordinate.longitude - firstNextCoordinate.longitude) <= COORDINATE_EPSILON;

  target.push(...(shouldSkipFirstCoordinate ? nextCoordinates.slice(1) : nextCoordinates));
};

const buildCompositePolyline = (segments: DirectionsRouteSegment[]) => {
  const coordinates: ReturnType<typeof decodePolyline> = [];
  for (const segment of segments) {
    appendCoordinates(coordinates, decodePolyline(segment.polyline));
  }

  if (coordinates.length === 0) return '';
  return encodePolyline(coordinates);
};

const mergeBounds = (routes: DirectionsRoute[]): DirectionsBounds | null => {
  let minLatitude = Number.POSITIVE_INFINITY;
  let minLongitude = Number.POSITIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let hasBounds = false;

  for (const route of routes) {
    const bounds = route.bounds;
    if (!bounds) continue;

    hasBounds = true;
    minLatitude = Math.min(minLatitude, bounds.southwest.latitude);
    minLongitude = Math.min(minLongitude, bounds.southwest.longitude);
    maxLatitude = Math.max(maxLatitude, bounds.northeast.latitude);
    maxLongitude = Math.max(maxLongitude, bounds.northeast.longitude);
  }

  if (!hasBounds) return null;

  return {
    northeast: { latitude: maxLatitude, longitude: maxLongitude },
    southwest: { latitude: minLatitude, longitude: minLongitude },
  };
};

const getRequiredShuttleLegs = (
  shuttlePlan: ShuttlePlan,
): readonly [ShuttlePlanLeg, ShuttlePlanLeg, ShuttlePlanLeg] => {
  const preShuttleWalk = shuttlePlan.preShuttleWalk;
  const shuttleRide = shuttlePlan.shuttleRide;
  const postShuttleWalk = shuttlePlan.postShuttleWalk;

  if (!preShuttleWalk || !shuttleRide || !postShuttleWalk) {
    throw new DirectionsServiceError(
      'INVALID_REQUEST',
      'Shuttle plan is missing one or more composite route legs.',
    );
  }

  return [preShuttleWalk, shuttleRide, postShuttleWalk] as const;
};

export const fetchShuttleCompositeDirections = async (
  shuttlePlan: ShuttlePlan,
  options: ShuttleDirectionsOptions = {},
): Promise<DirectionsRoute> => {
  const units = options.units ?? DEFAULT_UNITS;
  const fetchDirections = options.fetchDirections ?? fetchOutdoorDirections;
  const [preShuttleWalk, shuttleRide, postShuttleWalk] = getRequiredShuttleLegs(shuttlePlan);

  const [preWalkRoute, shuttleRoute, postWalkRoute] = await Promise.all([
    fetchRouteForLeg(preShuttleWalk, { units, language: options.language, fetchDirections }),
    fetchRouteForLeg(shuttleRide, { units, language: options.language, fetchDirections }),
    fetchRouteForLeg(postShuttleWalk, { units, language: options.language, fetchDirections }),
  ]);

  const orderedRoutes = [
    { leg: preShuttleWalk, route: preWalkRoute },
    { leg: shuttleRide, route: shuttleRoute },
    { leg: postShuttleWalk, route: postWalkRoute },
  ] as const;

  const routeSegments = orderedRoutes.flatMap(({ leg, route }) => toRouteSegments(route, leg));
  const compositePolyline = buildCompositePolyline(routeSegments);
  const fallbackPolyline =
    orderedRoutes.find(({ route }) => route.polyline.trim().length > 0)?.route.polyline ?? '';
  const polyline = compositePolyline || fallbackPolyline;
  const distanceMeters = orderedRoutes.reduce((sum, item) => sum + item.route.distanceMeters, 0);
  const durationSeconds = orderedRoutes.reduce((sum, item) => sum + item.route.durationSeconds, 0);

  return {
    polyline,
    distanceMeters,
    distanceText: formatDistance(distanceMeters, units),
    durationSeconds,
    durationText: formatDuration(durationSeconds),
    bounds: mergeBounds(orderedRoutes.map((item) => item.route)),
    routeSegments,
  };
};
