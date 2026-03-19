import { StyleSheet } from 'react-native';
export const roomListStyles = StyleSheet.create({
  container: {
    padding: 16,
  },

  buildingContainer: {
    marginBottom: 14,
  },
  indoorContainer: {},
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
    width:'65%',
    marginTop: 8,
    marginLeft:42,
    padding: 12,
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
    fontFamily:'ga'
  },
});
