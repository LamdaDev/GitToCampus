import { StyleSheet } from 'react-native';

const ACCENT = 'hsl(349, 61%, 35%)'; // deep crimson matching the map theme
const SURFACE = '#FFFFFF';
const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.18,
  shadowRadius: 6,
  elevation: 5,
};

const styles = StyleSheet.create({
  // ─── Root overlay container ───────────────────────────────────────────────
  overlayRow: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 10,
  },

  // ─── Floor selector (left column) ────────────────────────────────────────
  floorSelector: {
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: -20,
    gap: 2,
    ...SHADOW,
  },
  floorArrowButton: {
    padding: 4,
  },
  floorArrow: {
    color: SURFACE,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  floorNumber: {
    color: SURFACE,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    minWidth: 18,
    textAlign: 'center',
  },

  // ─── Building name pill (centre) ─────────────────────────────────────────
  buildingNamePill: {
    flex: 1,
    marginTop: -70,
    marginHorizontal: 10,
    backgroundColor: '#5a3037',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  buildingNameText: {
    color: SURFACE,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },

  // ─── Icon buttons (right column) ─────────────────────────────────────────
  iconButtonGroup: {
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
});

export default styles;
