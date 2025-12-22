import { StyleSheet } from "react-native";
import { ThemeColors } from "@src/contexts";

export const createQueueStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Tab styles
    tabBarContainer: {
      marginHorizontal: 16,
      marginBottom: 12,
      maxHeight: 48,
    },
    tabBarScroll: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    tabBar: {
      flexDirection: "row",
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
      marginBottom: 12,
    },
    tab: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      gap: 6,
    },
    tabActive: { backgroundColor: colors.surfaceElevated },
    tabText: { color: colors.textMuted, fontSize: 13, fontWeight: "500" },
    tabTextActive: { color: colors.text },
    badge: {
      backgroundColor: colors.textMuted,
      borderRadius: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
    },
    badgeActive: { backgroundColor: colors.primary },
    badgeProcessing: { backgroundColor: colors.warning },
    badgePaused: { backgroundColor: colors.textMuted },
    badgeCompleted: { backgroundColor: colors.success },
    badgeText: { color: colors.background, fontSize: 11, fontWeight: "600" },

    // Queue item styles
    queueItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
      minHeight: 78,
    },
    thumbnail: {
      width: 120,
      height: 68,
      backgroundColor: colors.surfaceLight,
      flexShrink: 0,
    },
    progressOverlay: {
      position: "absolute",
      left: 0,
      top: 0,
      width: 120,
      height: 68,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
    },
    progressText: { color: colors.text, fontSize: 14, fontWeight: "700" },
    itemInfo: { flex: 1, padding: 10 },
    itemTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: "500",
      lineHeight: 16,
    },
    itemMeta: { flexDirection: "row", gap: 6, marginTop: 4 },
    metaText: { color: colors.textMuted, fontSize: 11 },
    itemFooter: { marginTop: 4 },
    dateText: { color: colors.textMuted, fontSize: 11 },
    itemActions: { justifyContent: "center", paddingRight: 8, gap: 4 },
    actionBtn: { padding: 6 },
    actionBtnDisabled: { opacity: 0.5 },

    // Config picker styles
    configPicker: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    configPickerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    configPickerText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
      flex: 1,
    },
    configDropdown: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    configOption: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    configOptionActive: { backgroundColor: colors.surfaceElevated },
    configOptionText: { color: colors.text, fontSize: 13 },
    configOptionTextActive: { color: colors.primary, fontWeight: "600" },

    // Action section styles
    actionSection: { paddingHorizontal: 16, marginBottom: 12 },
    actionButtons: { flexDirection: "row", alignItems: "center", gap: 8 },
    actionButtonPrimary: { flex: 1 },
    clearAllBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    clearAllBtnFull: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: 10,
      paddingVertical: 10,
      gap: 8,
    },
    clearAllText: { color: colors.error, fontSize: 14, fontWeight: "500" },
    warningContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,183,77,0.15)",
      borderRadius: 10,
      padding: 10,
      marginBottom: 8,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warningText: { color: colors.warning, fontSize: 12, flex: 1 },

    // Empty & pagination styles
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
    },
    emptyText: { color: colors.textMuted, fontSize: 14 },
    pagination: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 16,
    },
    pageBtn: { padding: 8 },
    pageBtnDisabled: { opacity: 0.4 },
    pageText: { color: colors.text, fontSize: 14 },
  });

// Hook for using queue styles with theme
export const useQueueStyles = () => {
  const { useTheme } = require("@src/contexts");
  const { useThemedStyles } = require("@hooks/useThemedStyles");
  const { colors } = useTheme();
  return useThemedStyles(() => createQueueStyles(colors));
};

// Legacy export for backward compatibility
import { darkColors } from "@src/contexts";
export const queueStyles = createQueueStyles(darkColors);
