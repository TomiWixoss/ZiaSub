import React, { useState, useEffect } from "react";
import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Button3D from "../common/Button3D";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";
import { createQueueStyles } from "./queueStyles";
import ConfigPicker from "./ConfigPicker";
import { PresetPromptPicker } from "../subtitle/translate";
import { PRESET_PROMPTS, type PresetPromptType } from "@constants/defaults";
import { saveGeminiConfigs } from "@utils/storage";

interface QueueActionsProps {
  hasApiKey: boolean;
  configs: GeminiConfig[];
  selectedConfigId: string;
  showConfigPicker: boolean;
  onToggleConfigPicker: () => void;
  onSelectConfig: (configId: string) => void;
  onStartAll: () => void;
  onClearPending: () => void;
  onConfigsUpdated?: (configs: GeminiConfig[]) => void;
}

const QueueActions: React.FC<QueueActionsProps> = ({
  hasApiKey,
  configs,
  selectedConfigId,
  showConfigPicker,
  onToggleConfigPicker,
  onSelectConfig,
  onStartAll,
  onClearPending,
  onConfigsUpdated,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));
  const [currentPresetId, setCurrentPresetId] = useState<
    PresetPromptType | undefined
  >();

  // Detect current preset from selected config
  useEffect(() => {
    const selectedConfig = configs.find((c) => c.id === selectedConfigId);
    if (selectedConfig) {
      // Use presetId if set, otherwise check if systemPrompt matches any preset
      if (selectedConfig.presetId) {
        setCurrentPresetId(selectedConfig.presetId as PresetPromptType);
      } else {
        const matchingPreset = PRESET_PROMPTS.find(
          (p) => p.prompt === selectedConfig.systemPrompt
        );
        setCurrentPresetId(matchingPreset?.id || "custom");
      }
    }
  }, [selectedConfigId, configs]);

  const handleSelectPreset = async (
    prompt: string,
    presetId: PresetPromptType
  ) => {
    // Save presetId to config instead of overwriting systemPrompt
    const configIndex = configs.findIndex((c) => c.id === selectedConfigId);
    if (configIndex >= 0) {
      const updatedConfigs = [...configs];
      updatedConfigs[configIndex] = {
        ...updatedConfigs[configIndex],
        presetId: presetId === "custom" ? undefined : presetId,
      };
      setCurrentPresetId(presetId);
      await saveGeminiConfigs(updatedConfigs);
      onConfigsUpdated?.(updatedConfigs);
    }
  };

  return (
    <View style={styles.actionSection}>
      {!hasApiKey && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={colors.warning}
          />
          <Text style={styles.warningText}>{t("chat.noApiKey")}</Text>
        </View>
      )}
      <ConfigPicker
        configs={configs}
        selectedConfigId={selectedConfigId}
        showDropdown={showConfigPicker}
        onToggleDropdown={onToggleConfigPicker}
        onSelectConfig={onSelectConfig}
      />
      <PresetPromptPicker
        onSelectPreset={handleSelectPreset}
        currentPresetId={currentPresetId}
        style={{ marginBottom: 12 }}
      />
      <View style={styles.actionButtons}>
        <View style={styles.actionButtonPrimary}>
          <Button3D
            title={t("queue.actions.translateAll")}
            icon="play-circle"
            variant="primary"
            onPress={onStartAll}
            disabled={!hasApiKey}
          />
        </View>
        <Pressable style={styles.clearAllBtn} onPress={onClearPending}>
          <MaterialCommunityIcons
            name="delete-sweep"
            size={22}
            color={colors.error}
          />
        </Pressable>
      </View>
    </View>
  );
};

export default QueueActions;
