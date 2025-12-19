import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Button3D from "../common/Button3D";
import { useTheme } from "@src/contexts";
import { useThemedStyles } from "@hooks/useThemedStyles";
import type { GeminiConfig } from "@src/types";
import { createQueueStyles } from "./queueStyles";
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
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(() => createQueueStyles(colors));

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
        <TouchableOpacity style={styles.clearAllBtn} onPress={onClearPending}>
          <MaterialCommunityIcons
            name="delete-sweep"
            size={22}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default QueueActions;
