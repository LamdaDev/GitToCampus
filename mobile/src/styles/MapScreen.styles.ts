import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 2,
  },
  overlayText: {
    color: 'white',
    fontSize: 13,
    marginTop: 2,
  },
  poiMarker: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#111827',
  },
  labels: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 15,
    elevation: 2,
  },
  labelText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '700',
  },
});

export default styles;

/**
 * Campus polygon themes.
 * SGW: burgundy
 * LOYOLA: dark green
 */
export const POLYGON_THEME = {
  SGW: {
    stroke: 'rgba(128, 0, 32, 0.95)',
    fill: 'rgba(128, 0, 32, 0.30)',
    strokeWidth: 2,

    currentStroke: 'rgba(88, 0, 22, 1.0)',
    currentFill: 'rgba(88, 0, 22, 0.55)',
    currentStrokeWidth: 3,

    selectedStroke: '#1f5dd8',
    selectedFill: '#467599',
    selectedStrokeWidth: 2,

    labelFill: '#941014',
  },
  LOYOLA: {
    stroke: 'rgba(0, 90, 60, 0.95)',
    fill: 'rgba(0, 90, 60, 0.30)',
    strokeWidth: 2,

    currentStroke: 'rgba(0, 64, 42, 1.0)',
    currentFill: 'rgba(0, 64, 42, 0.55)',
    currentStrokeWidth: 3,

    selectedStroke: '#1f5dd8',
    selectedFill: '#467599',
    selectedStrokeWidth: 2,

    labelFill: '#076C00',
  },
} as const;
