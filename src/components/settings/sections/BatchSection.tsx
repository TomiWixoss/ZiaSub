import React, { useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles, createThemedStyles } from "@hooks/useThemedStyles";
import type { BatchSettings, GeminiConfig } from "@src/types";
import { saveBatchSettings, getGeminiConfigs } from "@utils/storage";

interface BatchSectionProps {
  batchSettings: BatchSettings;
  onBatchChange: (settings: BatchSettings) => void;
}

const BatchSection: React.FC<BatchSectionProps> = ({
  batchSettings,
  onBatchChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themedStyles = useThemedStyles(batchThemedStyles);
  const [geminiConfigs, setGeminiConfigs] = useState<GeminiConfig[]>([]);
  const [showConfigPicker, setShowConfigPicker] = useState(false);

  useEffect(() => {
    const loadConfigs = async () => {
      const configs = await getGeminiConfigs();
      // Filter out chat config
      setGeminiConfigs(configs.filter((c) => c.id !== "default-chat-config"));
    };
    loadConfigs();
  }, []);

  // Get selected presub config name
  const selectedPresubConfig = geminiConfigs.find(
    (c) => c.id === batchSettings.presubConfigId
  );
  const presubConfigName =
    selectedPresubConfig?.name || t("settings.batch.presubConfigSame");

  const handleBatchDurationChange = (value: number) => {
    const newSettings = { ...batchSettings, maxVideoDuration: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleConcurrentChange = (value: number) => {
    const newSettings = { ...batchSettings, maxConcurrentBatches: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handleOffsetChange = (value: number) => {
    const newSettings = { ...batchSettings, batchOffset: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handlePresubDurationChange = (value: number) => {
    const newSettings = { ...batchSettings, presubDuration: value };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
  };

  const handlePresubConfigChange = (configId: string | undefined) => {
    const newSettings = { ...batchSettings, presubConfigId: configId };
    onBatchChange(newSettings);
    saveBatchSettings(newSettings);
    setShowConfigPicker(false);
  };

  return (
    <>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.batch.batchDuration", {
            minutes: Math.floor(batchSettings.maxVideoDuration / 60),
          })}
        </Text>
        <Text style={themedStyles.settingHint}>
          {t("settings.batch.batchDurationHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={300}
          maximumValue={1800}
          step={60}
          value={batchSettings.maxVideoDuration}
          onValueChange={handleBatchDurationChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.batch.concurrent", {
            count: batchSettings.maxConcurrentBatches,
          })}
        </Text>
        <Text style={themedStyles.settingHint}>
          {t("settings.batch.concurrentHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={5}
          step={1}
          value={batchSettings.maxConcurrentBatches}
          onValueChange={handleConcurrentChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.batch.offset", {
            minutes: Math.floor((batchSettings.batchOffset ?? 60) / 60),
            seconds: (batchSettings.batchOffset ?? 60) % 60,
          })}
        </Text>
        <Text style={themedStyles.settingHint}>
          {t("settings.batch.offsetHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={300}
          step={30}
          value={batchSettings.batchOffset ?? 60}
          onValueChange={handleOffsetChange}
          minimumTrackTintColor={colors.primary}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.primary}
        />
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.batch.presubDuration", {
            minutes: Math.floor((batchSettings.presubDuration ?? 120) / 60),
            seconds: (batchSettings.presubDuration ?? 120) % 60,
          })}
        </Text>
        <Text style={themedStyles.settingHint}>
          {t("settings.batch.presubDurationHint")}
        </Text>
        <Slider
          style={styles.slider}
          minimumValue={60}
          maximumValue={300}
          step={30}
          value={batchSettings.presubDuration ?? 120}
          onValueChange={handlePresubDurationChange}
          minimumTrackTintColor={colors.warning}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.warning}
        />
      </View>
      <View style={styles.settingGroup}>
        <Text style={themedStyles.settingLabel}>
          {t("settings.batch.presubConfig")}
        </Text>
        <Text style={themedStyles.settingHint}>
          {t("settings.batch.presubConfigHint")}
        </Text>
        <Pressable
          style={themedStyles.configPicker}
          onPress={() => setShowConfigPicker(!showConfigPicker)}
        >
          <View style={styles.configPickerLeft}>
            <MaterialCommunityIcons
              name="lightning-bolt"
              size={20}
              color={colors.warning}
            />
            <Text style={themedStyles.configPickerText} numberOfLines={1}>
              {presubConfigName}
            </Text>
          </View>
          <MaterialCommunityIcons
            name={showConfigPicker ? "chevron-up" : "chevron-down"}
            size={20}
            color={colors.textMuted}
          />
        </Pressable>
        {showConfigPicker && (
          <View style={themedStyles.configDropdown}>
            <Pressable
              style={[
                themedStyles.configOption,
                !batchSettings.presubConfigId &&
                  themedStyles.configOptionActive,
              ]}
              onPress={() => handlePresubConfigChange(undefined)}
            >
              <Text
                style={[
                  themedStyles.configOptionText,
                  !batchSettings.presubConfigId &&
                    themedStyles.configOptionTextActive,
                ]}
              >
                {t("settings.batch.presubConfigSame")}
              </Text>
              {!batchSettings.presubConfigId && (
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color={colors.warning}
                />
              )}
            </Pressable>
            {geminiConfigs.map((config) => (
              <Pressable
                key={config.id}
                style={[
                  themedStyles.configOption,
                  batchSettings.presubConfigId === config.id &&
                    themedStyles.configOptionActive,
                ]}
                onPress={() => handlePresubConfigChange(config.id)}
              >
                <View style={styles.configOptionContent}>
                  <Text
                    style={[
                      themedStyles.configOptionText,
                      batchSettings.presubConfigId === config.id &&
                        themedStyles.configOptionTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {config.name}
                  </Text>
                  <Text
                    style={themedStyles.configOptionModel}
                    numberOfLines={1}
                  >
                    {config.model.replace("models/", "")}
                  </Text>
                </View>
                {batchSettings.presubConfigId === config.id && (
                  <MaterialCommunityIcons
                    name="check"
                    size={18}
                    color={colors.warning}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  settingGroup: { marginBottom: 16 },
  slider: { width: "100%", height: 40 },
  configPickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  configOptionContent: {
    flex: 1,
  },
});

const batchThemedStyles = createThemedStyles((colors) => ({
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  settingHint: { color: colors.textMuted, fontSize: 12, marginBottom: 8 },
  configPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  configPickerText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  configDropdown: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  configOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  configOptionActive: {
    backgroundColor: colors.warning + "15",
  },
  configOptionText: {
    color: colors.text,
    fontSize: 14,
  },
  configOptionTextActive: {
    color: colors.warning,
    fontWeight: "600",
  },
  configOptionModel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
}));

export default BatchSection;
