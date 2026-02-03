import { StyleSheet } from 'react-native';

/**
 * BottomSlider styles are separated from BottomSlider.tsx to keep UI logic and styling modular.
 * This helps maintain consistency as the app grows (more screens/components).
 */

export const bottomSliderStyles = StyleSheet.create({
sheetBackground: {
    backgroundColor: "#616263",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: '0 -3px 2px rgba(0, 0, 0, 0.25)',
  },
  handle: {
    backgroundColor: "#aaa",
    width: 120,
  },
  container: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  subtitle: {
    fontSize: 13,
    color: "#ccc",
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    backgroundColor: "#4A4A4A",
    borderRadius: 20,
    padding: 6,

    boxShadow: 'inset 0 -3px 2px rgba(0, 0, 0, 0.35)',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: "#6A6A6A",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: -3,
  },
  bullet: {
    color: "#fff",
    marginRight: 6,
    fontSize: 16,
  },
  bulletText: {
    color: "#ddd",
    textDecorationLine: "underline",
    fontSize: 13,
    flex: 1,
  },
});