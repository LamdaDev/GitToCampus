import { StyleSheet } from 'react-native';

const CONTROL_EDGE_OFFSET = 16;
const CALENDAR_BUTTON_SIZE = 56;
const CALENDAR_BUTTON_RADIUS = 20;
const CONTROLS_CONTAINER_WIDTH = 50;
const CONTROLS_CONTAINER_RADIUS = 25;
const CONTROL_BUTTON_HEIGHT = 50;
const LABEL_FONT_SIZE = 14;
const DIVIDER_HEIGHT = 1;
const DIVIDER_WIDTH = '70%';

const CONTROL_COLORS = {
  backgroundPrimary: 'hsla(349, 61%, 35%, 0.9)',
  backgroundSecondary: 'hsla(349, 61%, 35%, 0.85)',
  border: '#1f2937',
  pressedOverlay: 'rgba(0, 0, 0, 0.2)',
  label: '#EAEAEA',
  divider: '#6C6C6C',
  shadow: '#000',
} as const;

const CONTROL_SHADOW = {
  shadowColor: CONTROL_COLORS.shadow,
  shadowOpacity: 0.2,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  calendarButton: {
    position: 'absolute',
    top: CONTROL_EDGE_OFFSET,
    right: CONTROL_EDGE_OFFSET,
    width: CALENDAR_BUTTON_SIZE,
    height: CALENDAR_BUTTON_SIZE,
    borderRadius: CALENDAR_BUTTON_RADIUS,
    backgroundColor: CONTROL_COLORS.backgroundPrimary,
    borderColor: CONTROL_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...CONTROL_SHADOW,
    zIndex: 10,
  },
  container: {
    position: 'absolute',
    right: CONTROL_EDGE_OFFSET,
    bottom: 110, // Adjust position as needed
    width: CONTROLS_CONTAINER_WIDTH,
    backgroundColor: CONTROL_COLORS.backgroundSecondary,
    borderRadius: CONTROLS_CONTAINER_RADIUS,
    borderColor: CONTROL_COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...CONTROL_SHADOW,
    overflow: 'hidden',
    opacity: 0.85,
  },
  button: {
    width: '100%',
    height: CONTROL_BUTTON_HEIGHT, // Fixed height per button area
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    backgroundColor: CONTROL_COLORS.pressedOverlay,
  },
  label: {
    fontFamily: 'gabarito',
    fontWeight: '600',
    color: CONTROL_COLORS.label,
    fontSize: LABEL_FONT_SIZE,
  },
  divider: {
    width: DIVIDER_WIDTH,
    height: DIVIDER_HEIGHT,
    backgroundColor: CONTROL_COLORS.divider,
  },
});

export default styles;
