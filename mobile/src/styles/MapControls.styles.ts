import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 20, // Adjust position as needed
    width: 50,
    backgroundColor: '#4A4A4A',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    overflow: 'hidden',
    opacity: 0.85,
  },
  button: {
    width: '100%',
    height: 50, // Fixed height per button area
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  label: {
    fontFamily: 'gabarito',
    fontWeight: '600',
    color: '#EAEAEA',
    fontSize: 14,
  },
  divider: {
    width: '70%',
    height: 1,
    backgroundColor: '#6C6C6C',
  },
});

export default styles;
