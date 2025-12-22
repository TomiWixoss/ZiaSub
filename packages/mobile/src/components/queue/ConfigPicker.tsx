import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";
import { createQueueStyles } from "./queueStyles";

interface ConfigPickerProps {
  configs: GeminiConfig[];
  selectedConfigId: string;
  showDropdown: boolean;
  onToggleDropdown: () => void;
  onSelectConfig: (configId: string) => void;
}

const ConfigPicker: React.FC<ConfigPickerProps> = ({
  configs,
  selectedConfigId,
  showDropdown,
  onToggleDropdown,
  onSelectConfig,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));
  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <>
      <TouchableOpacity style={styles.configPicker} onPress={onToggleDropdown}>
        <View style={styles.configPickerLeft}>
          <MaterialCommunityIcons
            name="robot"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.configPickerText} numberOfLines={1}>
            {selectedConfig?.name || t("settings.geminiConfig.selectType")}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={18}
          color={colors.textMuted}
        />
      </TouchableOpacity>
      {showDropdown && (
        <View style={styles.configDropdown}>
          {configs.map((config) => (
            <TouchableOpacity
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
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );
};

export default ConfigPicker;
