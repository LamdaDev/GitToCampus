import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 124,
    left: 14,
    right: 72,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#bfdbfe',
  },
  chipText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#eff6ff',
  },
});

export default styles;
