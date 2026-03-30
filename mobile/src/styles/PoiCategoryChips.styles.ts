import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 72,
    left: 14,
    right: 72,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipSelected: {
    backgroundColor: '#0f766e',
    borderColor: '#99f6e4',
  },
  chipText: {
    color: '#f9fafb',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#ecfeff',
  },
});

export default styles;
