import { StyleSheet } from "react-native";
import { ThemeColors } from "@src/contexts";

export const createTranslateStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Saved translations styles
    translationsSection: { marginBottom: 16 },
    sectionTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
      marginBottom: 8,
    },
    translationsList: { maxHeight: 140, overflow: "hidden" },
    translationItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    translationItemActive: { borderColor: colors.success },
    translationInfo: { flex: 1, padding: 12 },
    translationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    translationConfig: { color: colors.text, fontSize: 13, fontWeight: "500" },
    translationDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    deleteBtn: { padding: 12 },

    // Config picker styles
    configPicker: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    configPickerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
    configPickerText: { color: colors.text, fontSize: 14, fontWeight: "500" },
    configDropdown: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    configOption: {
      padding: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    configOptionActive: { backgroundColor: colors.surfaceElevated },
    configOptionText: { color: colors.text, fontSize: 14 },
    configOptionTextActive: { color: colors.primary, fontWeight: "600" },

    // Progress styles
    progressContainer: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    progressHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    progressTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    progressTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    progressCount: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    keyStatusText: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 6,
      marginLeft: 30,
    },
    batchGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 12,
    },
    batchItem: {
      width: 44,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 4,
    },
    batchCompleted: { backgroundColor: colors.success },
    batchProcessing: { backgroundColor: colors.primary },
    batchError: { backgroundColor: colors.error },
    batchItemText: { color: colors.text, fontSize: 12, fontWeight: "600" },

    // Advanced options styles
    advancedToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 8,
      marginBottom: 8,
    },
    advancedToggleText: {
      color: colors.textMuted,
      fontSize: 13,
    },
    advancedPanel: {
      backgroundColor: colors.surfaceLight,
      borderRadius: 12,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    advancedRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    advancedRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      flex: 1,
    },
    advancedRowInfo: { flex: 1 },
    advancedRowTitle: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
    },
    advancedRowDesc: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },
    rangeInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rangeInputGroup: {
      alignItems: "center",
      gap: 4,
    },
    rangeLabel: {
      color: colors.textMuted,
      fontSize: 11,
    },
    rangeInput: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
      minWidth: 80,
      textAlign: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    durationHint: {
      color: colors.textMuted,
      fontSize: 11,
      textAlign: "center",
      marginTop: 8,
    },

    // Warning styles
    warningContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,183,77,0.15)",
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.warning,
    },
    warningText: {
      color: colors.warning,
      fontSize: 13,
      flex: 1,
    },
  });

// Legacy export for backward compatibility - components should use createTranslateStyles with useTheme
import { darkColors } from "@src/contexts";
export const translateStyles = createTranslateStyles(darkColors);
