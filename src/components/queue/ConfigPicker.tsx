import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import type { GeminiConfig } from "@src/types";
import { queueStyles as styles } from "./queueStyles";

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
  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <>
      <TouchableOpacity style={styles.configPicker} onPress={onToggleDropdown}>
        <View style={styles.configPickerLeft}>
          <MaterialCommunityIcons
            name="robot"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.configPickerText} numberOfLines={1}>
            {selectedConfig?.name || "Chọn kiểu dịch"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showDropdown ? "chevron-up" : "chevron-down"}
          size={18}
          color={COLORS.textMuted}
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
