import { StyleSheet, Dimensions } from 'react-native';

/**
 * BottomSlider styles are separated from BottomSlider.tsx to keep UI logic and styling modular.
 * This helps maintain consistency as the app grows (more screens/components).
 */

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const directionDetailsStyles = StyleSheet.create({
  directionTitle: {
    maxWidth: SCREEN_WIDTH * 0.55,
    fontSize: 30,
    fontFamily: 'gabarito',
    fontWeight: '600',
    color: '#D8D8D8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    marginTop: 15,
  },
  locationHeader: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 0,
    borderRadius: 40,
    boxShadow: 'inset 0 -3.5px 4px rgba(0, 0, 0, 0.4)',
  },
  subLocationHeader: {
    flexDirection: 'row',
    marginBottom: 0,
    marginTop: 0,
    marginLeft: 5,
    gap: 10,
    justifyContent: 'space-between',
  },
  inlineHeader: {
    flexDirection: 'row',
    marginBottom: 0,
    marginTop: 0,
    marginLeft: 5,
    gap: 10,
    alignSelf: 'start',
    justifyContent: 'space-between',
  },
  separationHeader: {
      marginTop: -20,
      marginBottom: -20,
      flexDirection: 'row',
      marginLeft: 5,
      gap: 10,
      alignSelf: 'start',
      justifyContent: 'space-between',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: '#4A4A4A',
    borderRadius: 20,
    padding: 8,
    opacity: 0.85,
    boxShadow: 'inset 0 -3.5px 4px rgba(0, 0, 0, 0.4)',
  },
  locationButton: {
    backgroundColor: 'red',
    borderRadius: 15,
    opacity: 0.85,
    padding: 5.5,
    paddingRight: 50,
    width: SCREEN_WIDTH * 0.50,
  },
  frontIcon: {
    color: "#fff",
    backgroundColor: "#000",
    padding: 8,
    borderRadius: 20,
  },
  dragIcon: {
      color: "#fff",
      backgroundColor: "transparent",
      padding: 8,
  },
});