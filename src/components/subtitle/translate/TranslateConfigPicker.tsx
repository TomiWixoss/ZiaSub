import React from "react";
import { View, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";
import { createTranslateStyles } from "./translateStyles";

interface TranslateConfigPickerProps {
  configs: GeminiConfig[];
  selectedConfigId: string;
  showPicker: boolean;
  onTogglePicker: () => void;
  onSelectConfig: (configId: string) => void;
}

const TranslateConfigPicker: React.FC<TranslateConfigPickerProps> = ({
  configs,
  selectedConfigId,
  showPicker,
  onTogglePicker,
  onSelectConfig,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createTranslateStyles(colors));
  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <>
      <Pressable style={styles.configPicker} onPress={onTogglePicker}>
        <View style={styles.configPickerLeft}>
          <MaterialCommunityIcons
            name="robot"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.configPickerText}>
            {selectedConfig?.name || t("subtitleModal.translate.selectConfig")}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showPicker ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>
      {showPicker && (
        <View style={styles.configDropdown}>
          {configs.map((config) => (
            <Pressable
              key={config.id}
              style={[
                styles.configOption,
                config.id === selectedConfigId && styles.configOptionActive,
              ]}
              onPress={() => onSelectConfig(config.id)}
            >
              <Text
                style={[
                  styles.configOptionText,
                  config.id === selectedConfigId &&
                    styles.configOptionTextActive,
                ]}
              >
                {config.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
};

export default TranslateConfigPicker;
