import { StyleSheet } from 'react-native';

export const mapScreenStyles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  overlayText: { fontWeight: '700' },
});
