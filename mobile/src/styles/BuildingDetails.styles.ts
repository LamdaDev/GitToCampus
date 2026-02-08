import { StyleSheet, Dimensions } from 'react-native';

/**
 * BottomSlider styles are separated from BottomSlider.tsx to keep UI logic and styling modular.
 * This helps maintain consistency as the app grows (more screens/components).
 */

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const buildingDetailsStyles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#4A4A4A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: '0 -3px 2px rgba(0, 0, 0, 0.25)',
    opacity: 0.91,
    paddingTop: 0,
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
    maxWidth: SCREEN_WIDTH * 0.55,
    fontSize: 24,
    fontFamily: 'gabarito',
    fontWeight: '600',
    color: '#D8D8D8',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'gabarito',
    color: '#D7D7D7',
    marginTop: 15,
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
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#6A6A6A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#fff',
    marginRight: 6,
    marginLeft: 8,
    fontSize: 16,
  },
  bulletText: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    fontFamily: 'gabarito',
    fontSize: 13,
    flex: 1,
  },
});
