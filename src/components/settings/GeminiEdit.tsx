import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  ScrollView,
} from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";

const AVAILABLE_MODELS = [
  { id: "models/gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
  { id: "models/gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)" },
  { id: "models/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "models/gemini-flash-latest", name: "Gemini Flash (Latest)" },
  { id: "models/gemini-flash-lite-latest", name: "Gemini Flash Lite (Latest)" },
];

interface GeminiEditProps {
  config: GeminiConfig;
  onChange: (config: GeminiConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}

const GeminiEdit: React.FC<GeminiEditProps> = ({
  config,
  onChange,
  onSave,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [showModelPicker, setShowModelPicker] = useState(false);
  const styles = useThemedStyles(themedStyles);

  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === config.model);
  const modelDisplayName = selectedModel?.name || config.model;

  return (
    <View
      style={[
        styles.fullScreen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={onCancel}>
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("settings.editConfig")}</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={onSave}>
          <MaterialCommunityIcons
            name="check"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>
            {t("settings.geminiConfig.name")}
          </Text>
          <RNTextInput
            style={styles.input}
            value={config.name}
            onChangeText={(text) => onChange({ ...config, name: text })}
            placeholder={t("settings.geminiConfig.namePlaceholder")}
            placeholderTextColor={colors.textMuted}
          />
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>
            {t("settings.geminiConfig.model")}
          </Text>
          <TouchableOpacity
            style={styles.modelPicker}
            onPress={() => setShowModelPicker(!showModelPicker)}
          >
            <Text style={styles.modelPickerText}>{modelDisplayName}</Text>
            <MaterialCommunityIcons
              name={showModelPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
          {showModelPicker && (
            <View style={styles.modelDropdown}>
              {AVAILABLE_MODELS.map((model) => (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelOption,
                    config.model === model.id && styles.modelOptionActive,
                  ]}
                  onPress={() => {
                    onChange({ ...config, model: model.id });
                    setShowModelPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modelOptionText,
                      config.model === model.id && styles.modelOptionTextActive,
                    ]}
                  >
                    {model.name}
                  </Text>
                  <Text style={styles.modelOptionId}>{model.id}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>
            {t("settings.geminiConfig.temperature", {
              value: config.temperature.toFixed(1),
            })}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={2}
            step={0.1}
            value={config.temperature}
            onValueChange={(value) =>
              onChange({ ...config, temperature: value })
            }
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.primary}
          />
        </View>
        <View style={styles.settingGroup}>
          <Text style={styles.settingLabel}>
            {t("settings.geminiConfig.systemPrompt")}
          </Text>
          <RNTextInput
            style={styles.promptInput}
            value={config.systemPrompt}
            onChangeText={(text) => onChange({ ...config, systemPrompt: text })}
            placeholder={t("settings.geminiConfig.systemPromptPlaceholder")}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  );
};

const themedStyles = createThemedStyles((colors) => ({
  fullScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface,
    zIndex: 100,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: 8,
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerBtn: {
    width: 44,
    height: 44,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: "600" as const },
  container: { flex: 1 },
  contentContainer: { padding: 20 },
  settingGroup: { marginBottom: 16 },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500" as const,
    marginBottom: 8,
  },
  slider: { width: "100%" as const, height: 40 },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  promptInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 200,
    maxHeight: 300,
  },
  modelPicker: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelPickerText: { color: colors.text, fontSize: 14 },
  modelDropdown: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden" as const,
  },
  modelOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelOptionActive: { backgroundColor: colors.surfaceElevated },
  modelOptionText: { color: colors.text, fontSize: 14 },
  modelOptionTextActive: { color: colors.primary, fontWeight: "600" as const },
  modelOptionId: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
}));

export { GeminiEdit };
export default GeminiEdit;
