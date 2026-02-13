import { StyleSheet, Dimensions } from 'react-native';

/**
 * BottomSlider styles are separated from BottomSlider.tsx to keep UI logic and styling modular.
 * This helps maintain consistency as the app grows (more screens/components).
 */

const SCREEN_WIDTH = Dimensions.get('window').width;

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
    paddingRight: 10,
    paddingLeft: 5,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
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
    alignSelf: 'flex-start',
    justifyContent: 'space-between',
  },
  separationHeader: {
    marginTop: -25,
    marginBottom: -25,
    flexDirection: 'row',
    marginLeft: 5,
    gap: 10,
    alignSelf: 'flex-start',
    justifyContent: 'space-between',
  },
  transportationSubHeader: {
    flexDirection: 'row',
    alignSelf: 'center',
    alignItems: 'flex-start',
    gap: 20,
  },
  transportationHeader: {
    borderRadius: 40,
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    boxShadow: 'inset 0 -3.5px 4px rgba(0, 0, 0, 0.4)',
  },
  transportationIcon: {
    color: '#fff',
    backgroundColor: 'transparent',
    alignSelf: 'center',
    padding: 10,
  },
  transportationButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 40,
  },
  activeTransportationButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderWidth: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 20,
    padding: 8,
    elevation: 10,
    boxShadow: 'inset 0 -3.5px 4px rgba(0, 0, 0, 0.4)',
  },
  locationButton: {
    backgroundColor: 'transparent',
    padding: 5.5,
    width: SCREEN_WIDTH * 0.5,
  },
  frontIcon: {
    color: '#fff',
    backgroundColor: 'transparent',
    padding: 8,
  },
  dragIcon: {
    color: '#fff',
    backgroundColor: 'transparent',
    padding: 8,
  },
});
