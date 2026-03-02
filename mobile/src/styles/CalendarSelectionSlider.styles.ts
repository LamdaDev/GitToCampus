import { StyleSheet } from 'react-native';

export const calendarSelectionSliderStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  doneButton: {
    alignSelf: 'stretch',
    marginTop: 10,
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
