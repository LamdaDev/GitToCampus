import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: 16,
    bottom: 80,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  label: {
    fontFamily: 'Gabarito-Bold',
    color: '#d8d8d8',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

export default styles;
