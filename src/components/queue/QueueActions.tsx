import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Button3D from "../Button3D";
import { COLORS } from "@constants/colors";
import type { GeminiConfig } from "@src/types";
import { queueStyles as styles } from "./queueStyles";
import ConfigPicker from "./ConfigPicker";

interface QueueActionsProps {
  hasApiKey: boolean;
  configs: GeminiConfig[];
  selectedConfigId: string;
  showConfigPicker: boolean;
  onToggleConfigPicker: () => void;
  onSelectConfig: (configId: string) => void;
  onStartAll: () => void;
  onClearPending: () => void;
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
}) => {
  return (
    <View style={styles.actionSection}>
      {/* API Key Warning */}
      {!hasApiKey && (
        <View style={styles.warningContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={18}
            color={COLORS.warning}
          />
          <Text style={styles.warningText}>
            Chưa có API key. Thêm trong Cài đặt nhé
          </Text>
        </View>
      )}

      {/* Config Picker */}
      <ConfigPicker
        configs={configs}
        selectedConfigId={selectedConfigId}
        showDropdown={showConfigPicker}
        onToggleDropdown={onToggleConfigPicker}
        onSelectConfig={onSelectConfig}
      />

      <View style={styles.actionButtons}>
        <View style={styles.actionButtonPrimary}>
          <Button3D
            title="Dịch tất cả"
            icon="play-circle"
            variant="primary"
            onPress={onStartAll}
            disabled={!hasApiKey}
          />
        </View>
        <TouchableOpacity style={styles.clearAllBtn} onPress={onClearPending}>
          <MaterialCommunityIcons
            name="delete-sweep"
            size={22}
            color={COLORS.error}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QueueActions;
