import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { COLORS } from "@constants/colors";
import type { GeminiConfig } from "@src/types";
import { translateStyles as styles } from "./translateStyles";

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
  const selectedConfig = configs.find((c) => c.id === selectedConfigId);

  return (
    <>
      <TouchableOpacity style={styles.configPicker} onPress={onTogglePicker}>
        <View style={styles.configPickerLeft}>
          <MaterialCommunityIcons
            name="robot"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.configPickerText}>
            {selectedConfig?.name || "Chọn kiểu dịch"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={showPicker ? "chevron-up" : "chevron-down"}
          size={20}
          color={COLORS.textMuted}
        />
      </TouchableOpacity>

      {showPicker && (
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

export default TranslateConfigPicker;
