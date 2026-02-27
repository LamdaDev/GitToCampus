import { StyleSheet, Dimensions } from 'react-native';

/**
 * BottomSlider styles are separated from BottomSlider.tsx to keep UI logic and styling modular.
 * This helps maintain consistency as the app grows (more screens/components).
 */

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const buildingDetailsStyles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: 'hsla(349, 61%, 35%, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: '0 -3px 2px rgba(0, 0, 0, 0.25)',
    paddingTop: 0,
    marginBottom: 50,
  },
  handle: {
    backgroundColor: '#000000',
    width: SCREEN_WIDTH * 0.35,
    top: SCREEN_HEIGHT * -0.005,
    opacity: 0.45,
  },
  container: {
    padding: 16,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    maxWidth: SCREEN_WIDTH * 0.65,
    fontSize: 22,
    fontFamily: 'gabarito',
    fontWeight: '600',
    color: '#D8D8D8',
  },
  subtitle: {
    maxWidth: SCREEN_WIDTH * 0.7,
    fontSize: 14,
    fontFamily: 'gabarito',
    color: '#D7D7D7',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 10,
  },
  navigationSection: {
    flexDirection: 'row',
    gap: 10,
    alignSelf: 'flex-start',
  },
  navigationButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderRadius: 14,
    padding: 8,
    opacity: 0.85,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 10,
    paddingBottom: 10,
    elevation: 10,
    boxShadow: '0 3px 6px rgba(0, 0, 0, 0.4)',
  },
  navigationButtonText: {
    fontSize: 13,
    color: 'white',
    marginLeft: 4,
  },
  iconButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderWidth: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 20,
    padding: 8,
    elevation: 10,
    boxShadow: 'inset 0 -3.5px 4px rgba(0, 0, 0, 0.4)',
  },
  servicesContainer: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 126,
    justifyContent: 'center',
    boxShadow: '0 10px 18px rgba(0, 0, 0, 0.32)',
  },
  servicesTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 9,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
    gap: 5,
  },
  uniqueServiceContainer: {
    width: '32%',
    padding: 10,
    borderRadius: 8,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 10, 16, 0.70)',
    borderColor: 'rgba(243, 235, 235, 0.32)',
    borderWidth: 1,
  },
  serviceText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
  },
});
