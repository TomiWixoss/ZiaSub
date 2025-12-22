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
    translationsList: { gap: 0 },
    translationItem: {
      flexDirection: "column",
      backgroundColor: colors.surfaceLight,
      borderRadius: 10,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    translationItemActive: { borderColor: colors.success },
    translationItemPartial: {
      borderColor: colors.warning,
      borderStyle: "dashed",
    },
    translationItemExpanded: {
      borderColor: colors.primary,
    },
    // Accordion header
    translationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
    },
    translationHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    translationHeaderInfo: {
      flex: 1,
    },
    translationHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    headerActionBtn: {
      padding: 4,
    },
    translationConfig: { color: colors.text, fontSize: 13, fontWeight: "500" },
    translationDate: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
    // Preset badge
    presetBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      backgroundColor: colors.primary + "18",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 6,
    },
    presetBadgeText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "500",
    },
    // Expanded content
    translationExpanded: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 12,
      backgroundColor: colors.surfaceElevated,
    },
    expandedProgressContainer: {
      marginBottom: 12,
    },
    partialProgressBar: {
      height: 4,
      backgroundColor: colors.surface,
      borderRadius: 2,
      overflow: "hidden",
    },
    partialProgressFill: {
      height: "100%",
      backgroundColor: colors.warning,
      borderRadius: 2,
    },
    partialProgressText: {
      color: colors.warning,
      fontSize: 10,
      fontWeight: "600",
      marginTop: 4,
    },
    // Batches grid
    batchesContainer: {
      marginBottom: 12,
    },
    batchesTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: "600",
      marginBottom: 8,
      textTransform: "uppercase",
    },
    batchesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    batchChipContainer: {
      alignItems: "center",
    },
    batchChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      minWidth: 54,
    },
    batchChipCompleted: {
      backgroundColor: colors.success + "20",
      borderColor: colors.success,
    },
    batchChipPending: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    batchChipError: {
      backgroundColor: colors.error + "20",
      borderColor: colors.error,
    },
    batchChipText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "700",
    },
    batchChipTextCompleted: {
      color: colors.success,
    },
    batchChipTextError: {
      color: colors.error,
    },
    batchChipTime: {
      color: colors.textMuted,
      fontSize: 9,
      marginTop: 2,
    },
    batchChipTimeCompleted: {
      color: colors.success,
    },
    batchChipTimeError: {
      color: colors.error,
    },
    batchActions: {
      flexDirection: "row",
      gap: 2,
      marginTop: 4,
    },
    batchActionBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceElevated,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    batchesHint: {
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 8,
      fontStyle: "italic",
    },
    // Expanded action buttons
    expandedActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    expandedActionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      flex: 1,
    },
    expandedActionBtnPrimary: {
      backgroundColor: colors.primary,
    },
    expandedActionBtnDanger: {
      backgroundColor: colors.error + "15",
      borderWidth: 1,
      borderColor: colors.error,
      flex: 0,
      paddingHorizontal: 12,
    },
    expandedActionBtnTextPrimary: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "600",
    },
    // Legacy - keep for backward compat
    translationInfo: { flex: 1, padding: 12 },
    resumeBtn: { padding: 12 },
    viewBatchesBtn: { padding: 12 },
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
      flexDirection: "column",
      gap: 12,
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rangeInputGroup: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
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
    timeInputWrapper: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    timeAdjustBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.surfaceElevated,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    timeAdjustBtnPressed: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    timeInputField: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
      minWidth: 70,
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
