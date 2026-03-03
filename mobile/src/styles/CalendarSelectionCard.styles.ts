import { StyleSheet } from 'react-native';

export const calendarSelectionCardStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(99, 24, 39, 0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    flex: 1,
    minHeight: 0,
  },
  options: {
    flex: 1,
    minHeight: 0,
  },
  optionsList: {
    width: '100%',
    flex: 1,
    minHeight: 0,
  },
  optionsListContent: {
    paddingBottom: 10,
  },
  optionGap: {
    height: 8,
  },
  option: {
    backgroundColor: 'rgba(45, 10, 16, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionSelected: {
    borderColor: 'rgba(211, 255, 210, 0.6)',
    backgroundColor: 'rgba(60, 18, 26, 0.9)',
  },
  optionText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  infoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
  },
  errorText: {
    color: '#ffd8ab',
    fontSize: 13,
    textAlign: 'center',
  },
  retryButton: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
