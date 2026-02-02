import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  overlayTitle: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 2,
  },
  overlayText: {
    color: "white",
    fontSize: 13,
    marginTop: 2,
  },
});

export default styles;

/**
 * Campus polygon themes.
 * SGW: burgundy
 * LOYOLA: dark green
 */
export const POLYGON_THEME = {
  SGW: {
    stroke: "rgba(128, 0, 32, 0.95)",
    fill: "rgba(128, 0, 32, 0.30)",
    strokeWidth: 2,

    selectedStroke: "rgba(128, 0, 32, 1.0)",
    selectedFill: "rgba(128, 0, 32, 0.50)",
    selectedStrokeWidth: 3,
  },
  LOYOLA: {
    stroke: "rgba(0, 90, 60, 0.95)",
    fill: "rgba(0, 90, 60, 0.30)",
    strokeWidth: 2,

    selectedStroke: "rgba(0, 90, 60, 1.0)",
    selectedFill: "rgba(0, 90, 60, 0.50)",
    selectedStrokeWidth: 3,
  },
} as const;
