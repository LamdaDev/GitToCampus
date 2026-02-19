import type { DirectionsUnits } from '../types/Directions';

export const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds} sec`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  if (remMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remMinutes} min`;
};

export const formatDistance = (meters: number, units: DirectionsUnits) => {
  if (units === 'imperial') {
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }

  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};
