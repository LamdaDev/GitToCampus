import { StyleSheet } from 'react-native';

export const searchBuilding = StyleSheet.create({
  
  screen: {
    flex: 1,
    
  },

  searchOuter: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingHorizontal: 0,
    
  },
  searchInner: {
    backgroundColor: 'rgb(103, 33, 47)',
    borderRadius: 100,
    height: 44,
    width:'100%'
  },
  searchText: {
    color: '#ffffff',
    fontFamily:'gaborito'
  },

  helperText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 18,
    opacity: 0.85,
  },

  signIn: {
    backgroundColor: '#ffffff',
    height: 40,
    width: '58%',
    alignSelf: 'center',
    marginTop: 14,
    flexDirection: 'row',
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  signInText: {
    color: '#111',
    fontWeight: '600',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 16,
    fontWeight: '600',
  },

  buildingsContainer: {
    marginTop: 26,
    backgroundColor: 'rgb(115, 35, 52)',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },

  listContent: {
    gap: 14, // spacing between pills
    marginHorizontal:8,
  },

  buildingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 18,

    backgroundColor: 'rgba(45, 10, 16, 0.65)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  iconWrap: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  textWrap: {
    flex: 1,
  },

  buildingName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  buildingAddress: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
});
