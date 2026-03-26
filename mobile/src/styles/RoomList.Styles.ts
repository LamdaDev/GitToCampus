import { StyleSheet } from 'react-native';
export const roomListStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },

  buildingContainer: {
    marginBottom: 14,
  },
  indoorContainer: {
    flex: 1,
    minHeight: 0,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    borderRadius: 14,
  },

  buildingTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },

  icon: {
    marginRight: 8,
  },
  buildingAddress: {
    fontSize: 12,
    color: '#ffffffb0',
    marginTop: 2,
  },
  contentContainer: {
    alignSelf: 'stretch',
    marginTop: 10,
    marginLeft: 42,
    marginRight: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: '#812236',
  },

  floorTitle: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 6,
  },

  roomItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff22',
  },

  roomText: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'gabarito',
  },
});
