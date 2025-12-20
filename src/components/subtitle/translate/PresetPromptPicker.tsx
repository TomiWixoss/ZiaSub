import React, { useState } from "react";
import { View, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Text, Portal, Modal } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { PRESET_PROMPTS, type PresetPromptType } from "@constants/defaults";

interface PresetPromptPickerProps {
  onSelectPreset: (prompt: string, presetId: PresetPromptType) => void;
  currentPresetId?: PresetPromptType;
}

const PresetPromptPicker: React.FC<PresetPromptPickerProps> = ({
  onSelectPreset,
  currentPresetId,
}) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const isVi = i18n.language === "vi";

  const handleSelect = (preset: (typeof PRESET_PROMPTS)[0]) => {
    onSelectPreset(preset.prompt, preset.id);
    setVisible(false);
  };

  const currentPreset = currentPresetId
    ? PRESET_PROMPTS.find((p) => p.id === currentPresetId)
    : null;

  return (
    <>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
        onPress={() => setVisible(true)}
      >
        <View style={styles.pickerLeft}>
          <MaterialCommunityIcons
            name={(currentPreset?.icon as any) || "file-document-outline"}
            size={20}
            color={colors.primary}
          />
          <View style={styles.pickerTextContainer}>
            <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>
              {t("settings.geminiConfig.presetPrompts")}
            </Text>
            <Text
              style={[styles.pickerValue, { color: colors.text }]}
              numberOfLines={1}
            >
              {currentPreset
                ? isVi
                  ? currentPreset.nameVi
                  : currentPreset.name
                : t("settings.geminiConfig.selectPreset")}
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={20}
          color={colors.textMuted}
        />
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t("settings.geminiConfig.selectPreset")}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.presetList}
            showsVerticalScrollIndicator={false}
          >
            {PRESET_PROMPTS.map((preset) => {
              const isSelected = preset.id === currentPresetId;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetItem,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : colors.surfaceElevated,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(preset)}
                >
                  <View
                    style={[
                      styles.presetIcon,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={preset.icon as any}
                      size={24}
                      color={isSelected ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.presetInfo}>
                    <Text
                      style={[
                        styles.presetName,
                        { color: isSelected ? colors.primary : colors.text },
                      ]}
                    >
                      {isVi ? preset.nameVi : preset.name}
                    </Text>
                    <Text
                      style={[styles.presetDesc, { color: colors.textMuted }]}
                      numberOfLines={2}
                    >
                      {preset.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={22}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  pickerTextContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  presetList: {
    padding: 12,
  },
  presetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  presetInfo: {
    flex: 1,
  },
  presetName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  presetDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});

export default PresetPromptPicker;
