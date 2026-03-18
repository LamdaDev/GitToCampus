import { StyleSheet, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

export const indoorBuildingSheetStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: '#45282d',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetBackground: {
    backgroundColor: '#45282d',
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
  searchContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 18,

    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },

  listContainer: {
    paddingBottom: 20,
  },

  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,

    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,80,90,0.15)', // subtle reddish divider
  },

  icon: {
    width: 34,
    height: 34,
    marginRight: 14,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  textContainer: {
    flex: 1,
  },

  buildingName: {
    color: '#F8F8F8',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  address: {
    color: '#B0A9AD',
    fontSize: 13,
    marginTop: 3,
  },
  searchOuter: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 5,
  },
  searchInner: {
    backgroundColor: '#1f1f1f',
    borderRadius: 100,
    height: 50,
  },
  searchText: {
    color: '#ffffff',
    fontFamily: 'gaborito',
  },
  listContent: {
    gap: 0, // spacing between pills
    marginHorizontal: 8,
  },
   buildingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 8,
    marginRight:25,
    borderBottomColor:'#6E1A2ABF',
    borderBottomWidth:1,
  },
});
