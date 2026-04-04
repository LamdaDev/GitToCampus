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
  searchBarRow: {
    position: 'relative',
    justifyContent: 'center',
    zIndex: 2,
  },
  searchInner: {
    backgroundColor: 'rgb(103, 33, 47)',
    borderRadius: 26,
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchText: {
    color: '#ffffff',
    fontFamily: 'gaborito',
    fontSize: 18,
  },
  searchOptionsButton: {
    position: 'absolute',
    right: 14,
    top: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -16 }],
  },
  poiControlsPanel: {
    marginTop: -22,
    paddingHorizontal: 14,
    paddingTop: 18,
    paddingBottom: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: 'rgba(188, 83, 104, 0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  poiCategoryColumn: {
    gap: 8,
  },
  poiCategoryCheckboxRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: 'rgba(103, 33, 47, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  poiCategoryCheckboxRowSelected: {
    backgroundColor: 'rgba(74, 16, 28, 0.95)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  poiCategoryCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#f7d5dc',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  poiCategoryCheckboxSelected: {
    backgroundColor: 'rgba(174, 48, 72, 0.92)',
    borderColor: '#fff4f6',
  },
  poiCategoryCheckboxLabel: {
    flex: 1,
    color: '#fff4f6',
    fontSize: 12,
    fontWeight: '700',
  },
  poiRangeRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  poiRangeLabel: {
    flex: 1,
    color: '#ffe4ea',
    fontSize: 13,
    fontWeight: '700',
  },
  poiRangeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  poiRangeValueBox: {
    minWidth: 58,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(103, 33, 47, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiRangeValueText: {
    color: '#fff4f6',
    fontSize: 14,
    fontWeight: '700',
  },
  poiRangeStepper: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(103, 33, 47, 0.88)',
  },
  poiRangeStepperButton: {
    width: 28,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  connectionStatus: {
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  connectionStatusConnected: {
    color: '#d9ffd6',
  },
  connectionStatusExpired: {
    color: '#ffd8ab',
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
  signInDisabled: {
    opacity: 0.65,
  },
  signInText: {
    color: '#111',
    fontWeight: '600',
  },
  nextClassCard: {
    marginTop: 14,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(45, 10, 16, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextClassTextWrap: {
    flex: 1,
  },
  nextClassTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  nextClassMeta: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.86)',
    fontSize: 18,
    fontWeight: '600',
  },
  nextClassGoButton: {
    height: 52,
    minWidth: 52,
    borderRadius: 12,
    backgroundColor: '#06C14F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nextClassGoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  authMessage: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
    opacity: 0.9,
    fontSize: 13,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingVertical: 30,
    fontSize: 16,
    fontWeight: '600',
  },

  buildingsContainer: {
    flex: 1,
    minHeight: 0,
    marginTop: 26,
    backgroundColor: 'rgb(115, 35, 52)',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingBottom: 28,
  },
  sectionTitle: {
    marginTop: 4,
    marginBottom: 10,
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  mixedSectionContainer: {
    marginBottom: 18,
  },

  listContent: {
    gap: 14, // spacing between pills
    marginHorizontal: 8,
    paddingBottom: 28,
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
