import { StyleSheet } from 'react-native';

export const calendarSelectionSliderStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
    gap: 10,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
  },
  cardWrapper: {
    flex: 1,
    minHeight: 0,
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
